#!/usr/bin/env node

/**
 * Import Cursor agent conversation transcripts into Elasticsearch as OTel-compatible trace spans.
 *
 * Each conversation becomes a trace. Messages (user, assistant) become spans in sequence.
 * Subagent conversations become child agent spans. Since Cursor transcripts lack timestamps
 * and token usage, we derive timestamps from file modification times and distribute
 * message timestamps evenly across the conversation window.
 *
 * Usage:
 *   node import_cursor.js [--project <project-name-suffix>] [--es-url <url>] [--es-user <user>] [--es-password <pw>]
 *
 * Defaults: ES at http://localhost:9200, auth elastic/changeme, all projects.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const CURSOR_DIR = path.join(require('os').homedir(), '.cursor', 'projects');
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
  return crypto.createHash('md5').update(`cursor-${sessionId}`).digest('hex');
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

function extractTextContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(b => typeof b === 'object' && (b.type === 'text' || b.type === 'thinking'))
      .map(b => b.text || '')
      .join('\n');
  }
  return '';
}

function extractToolUses(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter(b => typeof b === 'object' && b.type === 'tool_use')
    .map(b => ({ name: b.name, id: b.id }));
}

function getFileTimes(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      created: stat.birthtime || stat.ctime,
      modified: stat.mtime,
    };
  } catch {
    const now = new Date();
    return { created: now, modified: now };
  }
}

function distributeTimestamps(messageCount, startTime, endTime) {
  if (messageCount <= 1) return [startTime.toISOString()];
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();
  const step = (endMs - startMs) / (messageCount - 1);
  return Array.from({ length: messageCount }, (_, i) =>
    new Date(startMs + step * i).toISOString()
  );
}

function messageToSpan(msg, index, traceId, parentSpanId, sessionId, projectName, timestamp) {
  const spanId = generateSpanId();
  const role = msg.role || 'unknown';
  const content = extractTextContent(msg.message?.content);

  const base = {
    trace_id: traceId,
    span_id: spanId,
    parent_span_id: parentSpanId,
    status_code: 'OK',
    kind: 'INTERNAL',
    resource: {
      'service.name': 'cursor',
      'project.name': projectName,
    },
    conversation_id: sessionId,
    space: 'default',
    '@timestamp': timestamp,
    start_time: timestamp,
    end_time: timestamp,
    duration_ms: 0,
  };

  const attributes = {
    'cursor.session_id': sessionId,
    'cursor.message_index': index,
    'cursor.role': role,
  };

  if (role === 'user') {
    return {
      ...base,
      name: 'UserMessage',
      operation_name: 'user_message',
      inference_span_kind: 'CHAIN',
      attributes: {
        ...attributes,
        'input.value': content.substring(0, 10000),
      },
      events: [{
        name: 'gen_ai.user.message',
        time: timestamp,
        attributes: { role: 'user', content: content.substring(0, 5000) },
      }],
    };
  }

  if (role === 'assistant') {
    const toolUses = extractToolUses(msg.message?.content);
    return {
      ...base,
      name: 'ChatComplete',
      operation_name: 'chat',
      inference_span_kind: 'LLM',
      attributes: {
        ...attributes,
        'gen_ai.system': 'cursor',
        'output.value': content.substring(0, 10000),
        'cursor.tool_count': toolUses.length,
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

  // fallback for any other role
  return {
    ...base,
    name: `Message:${role}`,
    operation_name: role,
    inference_span_kind: 'CHAIN',
    attributes: {
      ...attributes,
      'input.value': content.substring(0, 10000),
    },
  };
}

async function processConversation(filePath, projectName) {
  const messages = await readJsonlFile(filePath);
  if (messages.length === 0) return [];

  const sessionId = path.basename(filePath, '.jsonl');
  const traceId = generateTraceId(sessionId);

  const { created, modified } = getFileTimes(filePath);
  const timestamps = distributeTimestamps(messages.length, created, modified);

  const firstTs = timestamps[0];
  const lastTs = timestamps[timestamps.length - 1];

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
      'cursor.session_id': sessionId,
      'cursor.project': projectName,
      'cursor.message_count': messages.length,
      'cursor.user_message_count': messages.filter(m => m.role === 'user').length,
      'cursor.assistant_message_count': messages.filter(m => m.role === 'assistant').length,
    },
    resource: {
      'service.name': 'cursor',
      'project.name': projectName,
    },
    space: 'default',
    '@timestamp': firstTs,
  };

  const docs = [rootSpan];

  for (let i = 0; i < messages.length; i++) {
    const span = messageToSpan(
      messages[i], i, traceId, rootSpanId, sessionId, projectName, timestamps[i]
    );
    docs.push(span);
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

    const { created, modified } = getFileTimes(filePath);
    const timestamps = distributeTimestamps(messages.length, created, modified);
    const firstTs = timestamps[0];
    const lastTs = timestamps[timestamps.length - 1];

    const agentRootSpanId = generateSpanId();
    allDocs.push({
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
      conversation_id: agentId,
      operation_name: 'subagent',
      inference_span_kind: 'AGENT',
      attributes: {
        'cursor.agent_id': agentId,
        'cursor.message_count': messages.length,
      },
      resource: {
        'service.name': 'cursor',
        'project.name': projectName,
      },
      space: 'default',
      '@timestamp': firstTs,
    });

    for (let i = 0; i < messages.length; i++) {
      const span = messageToSpan(
        messages[i], i, traceId, agentRootSpanId, agentId, projectName, timestamps[i]
      );
      allDocs.push(span);
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
  console.log(`Cursor projects dir: ${CURSOR_DIR}`);
  console.log('');

  if (!fs.existsSync(CURSOR_DIR)) {
    console.error(`Cursor projects directory not found: ${CURSOR_DIR}`);
    process.exit(1);
  }

  await ensureIndex(opts);

  // Find all project directories that contain agent-transcripts/
  const projectDirs = fs.readdirSync(CURSOR_DIR).filter(d => {
    const transcriptsDir = path.join(CURSOR_DIR, d, 'agent-transcripts');
    if (!fs.existsSync(transcriptsDir)) return false;
    if (opts.project) return d.includes(opts.project);
    return true;
  });

  console.log(`Found ${projectDirs.length} project(s) with agent transcripts\n`);

  let grandTotalDocs = 0;
  let grandTotalConversations = 0;

  for (const projectDir of projectDirs) {
    const projectName = projectDir;
    const transcriptsDir = path.join(CURSOR_DIR, projectDir, 'agent-transcripts');

    // Each conversation is a directory containing <uuid>.jsonl
    const conversationDirs = fs.readdirSync(transcriptsDir).filter(d => {
      const full = path.join(transcriptsDir, d);
      return fs.statSync(full).isDirectory();
    });

    if (conversationDirs.length === 0) continue;

    console.log(`Project: ${projectName} (${conversationDirs.length} conversations)`);

    let projectDocs = 0;

    for (const convDir of conversationDirs) {
      const sessionId = convDir;
      const jsonlPath = path.join(transcriptsDir, convDir, `${convDir}.jsonl`);

      if (!fs.existsSync(jsonlPath)) continue;

      const docs = await processConversation(jsonlPath, projectName);
      const traceId = generateTraceId(sessionId);
      const rootSpanId = docs.length > 0 ? docs[0].span_id : generateSpanId();

      // Process subagents
      const subagentDocs = await processSubagents(
        path.join(transcriptsDir, convDir), traceId, rootSpanId, projectName
      );

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
