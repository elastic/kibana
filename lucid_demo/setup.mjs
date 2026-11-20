#!/usr/bin/env node
/*
 * Lucid dreaming demo helper.
 *
 *   node lucid_demo/setup.mjs setup    Resets, then creates the demo AI index and agent.
 *   node lucid_demo/setup.mjs status   Prints what the AI index and the traces hold.
 *   node lucid_demo/setup.mjs reset    Deletes the demo AI index, agent and traces.
 *
 * Env: KIBANA_URL (http://localhost:5601), ES_URL (http://localhost:9200),
 *      KIBANA_USER (elastic), KIBANA_PASSWORD (changeme), SPACE (default).
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const KIBANA_URL = process.env.KIBANA_URL ?? 'http://localhost:5601';
const ES_URL = process.env.ES_URL ?? 'http://localhost:9200';
const USER = process.env.KIBANA_USER ?? 'elastic';
const PASSWORD = process.env.KIBANA_PASSWORD ?? 'changeme';
const SPACE = process.env.SPACE ?? 'default';

const AI_INDEX_ID = 'lucid_demo';
const AI_INDEX_DEST = `ai-index-idx-${AI_INDEX_ID}`;
const AGENT_ID = 'lucid-demo-support';
const TRACES_INDEX = `traces-agent_builder.otel-${SPACE}`;
const LUCID_INTERVAL = '1m';
const RELATIONSHIP_INTERVAL = '1h';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(
  here,
  '../x-pack/platform/plugins/shared/context_engine/server/dreaming/templates/customer_support.json'
);

const AGENT_INSTRUCTIONS = `You are the Acme Cloud support assistant. You help support engineers work through customer tickets.

- Keep answers short: two to four sentences.
- Support engineers know the product: treat what they tell you about tickets, fixes and policies as confirmed.
- Do not load skills or search AI indices unless the user asks you a question you cannot answer from the conversation.
- Save a memory only when the user asks you to remember something. Save it to the \`${AI_INDEX_ID}\` AI index as one memory.session_fact, and say in one line what you saved.
- Do not save anything the user did not ask you to remember.`;

const auth = `Basic ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}`;
const spacePrefix = SPACE === 'default' ? '' : `/s/${SPACE}`;

const kibana = async (method, apiPath, { body, version = '2023-10-31', allow = [] } = {}) => {
  const response = await fetch(`${KIBANA_URL}${spacePrefix}${apiPath}`, {
    method,
    headers: {
      authorization: auth,
      'content-type': 'application/json',
      'kbn-xsrf': 'lucid-demo',
      'x-elastic-internal-origin': 'kibana',
      'elastic-api-version': version,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok && !allow.includes(response.status)) {
    throw new Error(`${method} ${apiPath} answered ${response.status}: ${text}`);
  }
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
};

const es = async (method, esPath, body) => {
  const response = await fetch(`${ES_URL}${esPath}`, {
    method,
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
};

const reset = async () => {
  await kibana(
    'DELETE',
    `/api/context_engine/ai_index/${AI_INDEX_ID}?delete_knowledge_indicators=true&delete_automations=true`,
    { allow: [404] }
  );
  await kibana('DELETE', `/api/agent_builder/agents/${AGENT_ID}`, { allow: [404] });
  const { body } = await es(
    'POST',
    `/${TRACES_INDEX}/_delete_by_query?ignore_unavailable=true&conflicts=proceed&refresh=true`,
    { query: { term: { 'attributes.gen_ai.agent.id': AGENT_ID } } }
  );
  console.log(
    `Reset: deleted AI index '${AI_INDEX_ID}', agent '${AGENT_ID}' and ${
      body?.deleted ?? 0
    } trace spans.`
  );
};

const setup = async () => {
  await reset();
  const { dreaming: template } = JSON.parse(await readFile(TEMPLATE_PATH, 'utf8'));

  await kibana('POST', '/api/context_engine/ai_index', {
    body: {
      id: AI_INDEX_ID,
      description: 'What Acme Cloud support has learned from tickets: known issues, fixes and policies.',
      dest: { type: 'index', value: AI_INDEX_DEST },
    },
  });

  await kibana('POST', '/api/agent_builder/agents', {
    body: {
      id: AGENT_ID,
      name: 'Acme support assistant',
      description: 'Helps Acme Cloud support engineers with tickets. Demo agent for lucid dreaming.',
      configuration: {
        instructions: AGENT_INSTRUCTIONS,
        tools: [],
        ai_indices: [AI_INDEX_ID],
      },
    },
  });

  await kibana('PUT', `/api/context_engine/ai_index/${AI_INDEX_ID}`, {
    body: {
      description: 'What Acme Cloud support has learned from tickets: known issues, fixes and policies.',
      dest: { type: 'index', value: AI_INDEX_DEST },
      traces: [{ type: 'elastic_agent', value: AGENT_ID }],
    },
  });

  await kibana('PUT', `/internal/context_engine/ai_index/${AI_INDEX_ID}/dreaming`, {
    version: '1',
    body: {
      ...template,
      enabled: false,
      lucid: { enabled: false, interval: LUCID_INTERVAL },
      relationship_dreaming: { enabled: false, interval: RELATIONSHIP_INTERVAL },
    },
  });

  console.log(
    `Setup: AI index '${AI_INDEX_ID}' (customer support dreaming types, dreaming off) and agent '${AGENT_ID}' are ready.`
  );
};

const status = async () => {
  const kis = await es('POST', `/${AI_INDEX_DEST}/_search?ignore_unavailable=true`, {
    size: 50,
    sort: [{ updated_at: 'asc' }],
    _source: ['type', 'title', 'updated_at'],
    query: { match_all: {} },
  });
  const hits = kis.body?.hits?.hits ?? [];
  console.log(`AI index '${AI_INDEX_ID}': ${hits.length} documents`);
  for (const { _source: source } of hits) {
    console.log(`  ${source.updated_at ?? ''}  ${source.type.padEnd(28)} ${source.title}`);
  }

  const rounds = await es('POST', `/${TRACES_INDEX}/_search?ignore_unavailable=true`, {
    size: 0,
    query: { term: { 'attributes.gen_ai.agent.id': AGENT_ID } },
    aggs: {
      rounds: { cardinality: { field: 'trace_id' } },
      last: { max: { field: '@timestamp' } },
    },
  });
  const aggs = rounds.body?.aggregations;
  console.log(
    `Agent '${AGENT_ID}' transcripts: ${aggs?.rounds?.value ?? 0} rounds${
      aggs?.last?.value_as_string ? `, last span at ${aggs.last.value_as_string}` : ''
    }`
  );
};

const commands = { setup, status, reset };
const command = commands[process.argv[2]];
if (!command) {
  console.error('Usage: node lucid_demo/setup.mjs <setup|status|reset>');
  process.exit(1);
}
command().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
