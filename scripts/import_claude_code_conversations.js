#!/usr/bin/env node

/**
 * Import Claude Code conversations into Elasticsearch as OTel-compatible trace spans.
 *
 * Each conversation becomes a trace. Messages (user, assistant, system) become spans.
 * Tool uses and subagent calls become child spans. Token usage is captured from
 * assistant messages.
 *
 * Usage:
 *   node import_commands.js [--project <project-path-suffix>] [--es-url <url>] [--es-user <user>] [--es-password <pw>]
 *
 * Defaults: ES at http://localhost:9200, auth elastic/changeme, all projects.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const CLAUDE_DIR = path.join(require('os').homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const INDEX_NAME = 'claude-code-otel-traces';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    esUrl: 'http://localhost:9200',
    esUser: 'elastic',
    esPassword: 'changeme',
    project: null,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--es-url': opts.esUrl = args[++i]; break;
      case '--es-user': opts.esUser = args[++i]; break;
      case '--es-password': opts.esPassword = args[++i]; break;
      case '--project': opts.project = args[++i]; break;
    }
  }
  return opts;
}

function generateSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

function generateTraceId(sessionId) {
  return crypto.createHash('md5').update(sessionId).digest('hex');
}

async function readJsonlFile(filePath) {
  const messages = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      messages.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return messages;
}

function messageToSpan(msg, traceId, parentSpanId, sessionId, projectName) {
  const spanId = generateSpanId();
  const timestamp = msg.timestamp || new Date().toISOString();
  const type = msg.type || 'unknown';

  const base = {
    trace_id: traceId,
    span_id: spanId,
    parent_span_id: parentSpanId,
    status_code: 'OK',
    kind: 'INTERNAL',
    resource: {
      'service.name': 'claude-code',
      'service.version': msg.version || 'unknown',
      'project.name': projectName,
    },
    conversation_id: sessionId,
    space: 'default',
    '@timestamp': timestamp,
    start_time: timestamp,
  };

  const attributes = {
    'claude.message.uuid': msg.uuid,
    'claude.message.type': type,
    'claude.session_id': sessionId,
    'claude.git_branch': msg.gitBranch || undefined,
    'claude.cwd': msg.cwd || undefined,
    'claude.version': msg.version || undefined,
    'claude.user_type': msg.userType || undefined,
  };

  if (msg.agentId) {
    attributes['claude.agent_id'] = msg.agentId;
  }
  if (msg.slug) {
    attributes['claude.slug'] = msg.slug;
  }

  if (type === 'user') {
    const content = extractTextContent(msg.message?.content);
    return {
      ...base,
      name: 'UserMessage',
      operation_name: 'user_message',
      inference_span_kind: 'CHAIN',
      end_time: timestamp,
      duration_ms: 0,
      attributes: {
        ...attributes,
        'input.value': content.substring(0, 10000),
        'claude.is_meta': msg.isMeta || false,
      },
      events: [{
        name: 'gen_ai.user.message',
        time: timestamp,
        attributes: { role: 'user', content: content.substring(0, 5000) },
      }],
    };
  }

  if (type === 'assistant') {
    const apiMsg = msg.message || {};
    const content = extractTextContent(apiMsg.content);
    const usage = apiMsg.usage || {};
    const model = apiMsg.model || 'unknown';
    const toolUses = extractToolUses(apiMsg.content);

    const endTime = timestamp;
    return {
      ...base,
      name: 'ChatComplete',
      operation_name: 'chat',
      inference_span_kind: 'LLM',
      model,
      input_tokens: (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0),
      output_tokens: usage.output_tokens || 0,
      end_time: endTime,
      duration_ms: 0,
      attributes: {
        ...attributes,
        'gen_ai.response.model': model,
        'gen_ai.system': 'anthropic',
        'gen_ai.usage.input_tokens': usage.input_tokens || 0,
        'gen_ai.usage.output_tokens': usage.output_tokens || 0,
        'gen_ai.usage.cache_creation_input_tokens': usage.cache_creation_input_tokens || 0,
        'gen_ai.usage.cache_read_input_tokens': usage.cache_read_input_tokens || 0,
        'gen_ai.stop_reason': apiMsg.stop_reason || undefined,
        'output.value': content.substring(0, 10000),
        'claude.tool_count': toolUses.length,
        'claude.request_id': msg.requestId || undefined,
      },
      events: [
        {
          name: 'gen_ai.assistant.message',
          time: timestamp,
          attributes: { role: 'assistant', content: content.substring(0, 5000) },
        },
        ...toolUses.map(tu => ({
          name: 'gen_ai.tool.call',
          time: timestamp,
          attributes: { tool_name: tu.name, tool_id: tu.id },
        })),
      ],
    };
  }

  if (type === 'progress') {
    const data = msg.data || {};
    const progressType = data.type || 'unknown';
    return {
      ...base,
      name: `Progress:${progressType}`,
      operation_name: 'progress',
      inference_span_kind: 'TOOL',
      end_time: timestamp,
      duration_ms: 0,
      attributes: {
        ...attributes,
        'claude.progress.type': progressType,
        'claude.tool_use_id': msg.toolUseID || undefined,
      },
    };
  }

  if (type === 'system') {
    const content = extractTextContent(msg.message?.content);
    return {
      ...base,
      name: 'SystemMessage',
      operation_name: 'system',
      inference_span_kind: 'CHAIN',
      end_time: timestamp,
      duration_ms: 0,
      attributes: {
        ...attributes,
        'input.value': content.substring(0, 10000),
      },
    };
  }

  // file-history-snapshot and other types — skip by returning null
  return null;
}

function extractTextContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(b => b.type === 'text' || b.type === 'thinking')
      .map(b => b.text || '')
      .join('\n');
  }
  return '';
}

function extractToolUses(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter(b => b.type === 'tool_use')
    .map(b => ({ name: b.name, id: b.id }));
}

async function processConversation(filePath, projectName) {
  const messages = await readJsonlFile(filePath);
  if (messages.length === 0) return [];

  const sessionId = path.basename(filePath, '.jsonl');
  const traceId = generateTraceId(sessionId);

  // The conversation itself is the root span
  const firstTs = messages.find(m => m.timestamp)?.timestamp || new Date().toISOString();
  const lastTs = [...messages].reverse().find(m => m.timestamp)?.timestamp || firstTs;
  const rootSpanId = generateSpanId();

  const rootSpan = {
    trace_id: traceId,
    span_id: rootSpanId,
    name: 'Converse',
    kind: 'INTERNAL',
    status_code: 'OK',
    start_time: firstTs,
    end_time: lastTs,
    duration_ms: Math.max(0, new Date(lastTs) - new Date(firstTs)),
    conversation_id: sessionId,
    operation_name: 'converse',
    inference_span_kind: 'CHAIN',
    attributes: {
      'claude.session_id': sessionId,
      'claude.project': projectName,
      'claude.message_count': messages.length,
      'claude.git_branch': messages.find(m => m.gitBranch)?.gitBranch || undefined,
    },
    resource: {
      'service.name': 'claude-code',
      'service.version': messages.find(m => m.version)?.version || 'unknown',
      'project.name': projectName,
    },
    space: 'default',
    '@timestamp': firstTs,
  };

  const docs = [rootSpan];

  // Build a map of uuid -> span for parent linking
  const uuidToSpanId = {};
  uuidToSpanId[null] = rootSpanId;
  uuidToSpanId[undefined] = rootSpanId;

  for (const msg of messages) {
    const parentUuid = msg.parentUuid;
    const parentSpanId = uuidToSpanId[parentUuid] || rootSpanId;

    const span = messageToSpan(msg, traceId, parentSpanId, sessionId, projectName);
    if (span) {
      docs.push(span);
      if (msg.uuid) {
        uuidToSpanId[msg.uuid] = span.span_id;
      }
    }
  }

  return docs;
}

async function processSubagents(conversationDir, traceId, parentSpanId, projectName) {
  const subagentsDir = path.join(conversationDir, 'subagents');
  if (!fs.existsSync(subagentsDir)) return [];

  const files = fs.readdirSync(subagentsDir).filter(f => f.endsWith('.jsonl'));
  const allDocs = [];

  for (const file of files) {
    const filePath = path.join(subagentsDir, file);
    const agentId = path.basename(file, '.jsonl');
    const messages = await readJsonlFile(filePath);
    if (messages.length === 0) continue;

    const sessionId = messages[0]?.sessionId || agentId;
    const firstTs = messages.find(m => m.timestamp)?.timestamp || new Date().toISOString();
    const lastTs = [...messages].reverse().find(m => m.timestamp)?.timestamp || firstTs;

    const agentRootSpanId = generateSpanId();
    const agentRootSpan = {
      trace_id: traceId,
      span_id: agentRootSpanId,
      parent_span_id: parentSpanId,
      name: `Subagent:${agentId}`,
      kind: 'INTERNAL',
      status_code: 'OK',
      start_time: firstTs,
      end_time: lastTs,
      duration_ms: Math.max(0, new Date(lastTs) - new Date(firstTs)),
      agent_id: agentId,
      conversation_id: sessionId,
      operation_name: 'subagent',
      inference_span_kind: 'AGENT',
      attributes: {
        'claude.agent_id': agentId,
        'claude.session_id': sessionId,
        'claude.message_count': messages.length,
      },
      resource: {
        'service.name': 'claude-code',
        'service.version': messages.find(m => m.version)?.version || 'unknown',
        'project.name': projectName,
      },
      space: 'default',
      '@timestamp': firstTs,
    };

    allDocs.push(agentRootSpan);

    const uuidToSpanId = {};
    for (const msg of messages) {
      const parentId = uuidToSpanId[msg.parentUuid] || agentRootSpanId;
      const span = messageToSpan(msg, traceId, parentId, sessionId, projectName);
      if (span) {
        allDocs.push(span);
        if (msg.uuid) {
          uuidToSpanId[msg.uuid] = span.span_id;
        }
      }
    }
  }

  return allDocs;
}

function esRequest(opts, url, method, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const auth = Buffer.from(`${opts.esUser}:${opts.esPassword}`).toString('base64');

    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
    };

    const req = transport.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function ensureIndex(opts) {
  const { status } = await esRequest(opts, `${opts.esUrl}/${INDEX_NAME}`, 'HEAD', null);
  if (status === 200) {
    console.log(`Index ${INDEX_NAME} already exists`);
    return;
  }

  const { status: createStatus, body } = await esRequest(opts, `${opts.esUrl}/${INDEX_NAME}`, 'PUT', {
    mappings: {
      dynamic: false,
      properties: {
        trace_id: { type: 'keyword' },
        span_id: { type: 'keyword' },
        parent_span_id: { type: 'keyword' },
        name: { type: 'keyword' },
        kind: { type: 'keyword' },
        status_code: { type: 'keyword' },
        status_message: { type: 'text' },
        start_time: { type: 'date' },
        end_time: { type: 'date' },
        duration_ms: { type: 'float' },
        agent_id: { type: 'keyword' },
        conversation_id: { type: 'keyword' },
        operation_name: { type: 'keyword' },
        inference_span_kind: { type: 'keyword' },
        model: { type: 'keyword' },
        input_tokens: { type: 'long' },
        output_tokens: { type: 'long' },
        attributes: { type: 'flattened' },
        events: { type: 'object', dynamic: false },
        resource: { type: 'flattened' },
        space: { type: 'keyword' },
        '@timestamp': { type: 'date' },
      },
    },
    settings: {
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
    },
  });

  if (createStatus >= 200 && createStatus < 300) {
    console.log(`Created index ${INDEX_NAME}`);
  } else if (body?.error?.type === 'resource_already_exists_exception') {
    console.log(`Index ${INDEX_NAME} already exists (race condition)`);
  } else {
    console.error(`Failed to create index: ${JSON.stringify(body)}`);
    process.exit(1);
  }
}

async function bulkIndex(opts, docs) {
  if (docs.length === 0) return { indexed: 0, errors: 0 };

  const BATCH_SIZE = 500;
  let totalIndexed = 0;
  let totalErrors = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const ndjson = batch.flatMap(doc => [
      JSON.stringify({ index: { _index: INDEX_NAME } }),
      JSON.stringify(doc),
    ]).join('\n') + '\n';

    const { body } = await esRequest(opts, `${opts.esUrl}/_bulk`, 'POST', ndjson);

    if (body.errors) {
      const failed = body.items.filter(item => item.index?.error);
      totalErrors += failed.length;
      if (failed.length > 0) {
        console.error(`  Bulk errors (first): ${JSON.stringify(failed[0].index.error)}`);
      }
    }
    totalIndexed += batch.length - (body.errors ? body.items.filter(item => item.index?.error).length : 0);
  }

  return { indexed: totalIndexed, errors: totalErrors };
}

async function main() {
  const opts = parseArgs();

  console.log(`Elasticsearch: ${opts.esUrl}`);
  console.log(`Index: ${INDEX_NAME}`);
  console.log(`Claude projects dir: ${PROJECTS_DIR}`);
  console.log('');

  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(`Claude projects directory not found: ${PROJECTS_DIR}`);
    process.exit(1);
  }

  await ensureIndex(opts);

  const projectDirs = fs.readdirSync(PROJECTS_DIR).filter(d => {
    const full = path.join(PROJECTS_DIR, d);
    if (!fs.statSync(full).isDirectory()) return false;
    if (opts.project) return d.includes(opts.project);
    return true;
  });

  console.log(`Found ${projectDirs.length} project(s) to process\n`);

  let grandTotalDocs = 0;
  let grandTotalConversations = 0;

  for (const projectDir of projectDirs) {
    const projectPath = path.join(PROJECTS_DIR, projectDir);
    const projectName = projectDir;

    const conversationFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));
    if (conversationFiles.length === 0) continue;

    console.log(`Project: ${projectName} (${conversationFiles.length} conversations)`);

    let projectDocs = 0;

    for (const file of conversationFiles) {
      const filePath = path.join(projectPath, file);
      const sessionId = path.basename(file, '.jsonl');

      const docs = await processConversation(filePath, projectName);
      const traceId = generateTraceId(sessionId);
      const rootSpanId = docs.length > 0 ? docs[0].span_id : generateSpanId();

      // Process subagents for this conversation
      const conversationDir = path.join(projectPath, sessionId);
      const subagentDocs = await processSubagents(conversationDir, traceId, rootSpanId, projectName);

      const allDocs = [...docs, ...subagentDocs];

      if (allDocs.length > 0) {
        const { indexed, errors } = await bulkIndex(opts, allDocs);
        projectDocs += indexed;
        if (errors > 0) {
          console.log(`  ${sessionId}: ${indexed} spans indexed, ${errors} errors`);
        }
      }

      grandTotalConversations++;
    }

    console.log(`  Total: ${projectDocs} spans indexed\n`);
    grandTotalDocs += projectDocs;
  }

  console.log('='.repeat(60));
  console.log(`Done! ${grandTotalConversations} conversations -> ${grandTotalDocs} spans indexed into ${INDEX_NAME}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
