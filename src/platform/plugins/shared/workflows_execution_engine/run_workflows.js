#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DEFAULT_KIBANA_URL = 'http://localhost:5601';
const DEFAULT_USERNAME = 'elastic';
const DEFAULT_PASSWORD = 'changeme';
const DEFAULT_SPACE_ID = 'default';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

const config = {
  kibanaUrl: process.env.KIBANA_URL ?? DEFAULT_KIBANA_URL,
  username: process.env.KIBANA_USERNAME ?? DEFAULT_USERNAME,
  password: process.env.KIBANA_PASSWORD ?? DEFAULT_PASSWORD,
  spaceId: process.env.KIBANA_SPACE_ID ?? DEFAULT_SPACE_ID,
  childWorkflowId: process.env.CHILD_WORKFLOW_ID ?? 'child-workflow',
  metricsCollectorWorkflowId:
    process.env.METRICS_COLLECTOR_WORKFLOW_ID ?? 'workflow-metrics-collector',
};

const normalizeWorkflowId = (workflowId) => workflowId.replace(/^\/+/, '');

const getRunWorkflowPath = (workflowId) => {
  const normalizedWorkflowId = normalizeWorkflowId(workflowId);
  const encodedWorkflowId = encodeURIComponent(normalizedWorkflowId);
  const spacePrefix =
    config.spaceId === 'default' ? '' : `/s/${encodeURIComponent(config.spaceId)}`;

  return `${spacePrefix}/api/workflows/workflow/${encodedWorkflowId}/run`;
};

const parseResponseBody = (responseText) => {
  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText };
  }
};

const runWorkflow = async (workflowId) => {
  const url = new URL(getRunWorkflowPath(workflowId), config.kibanaUrl);
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
    },
    body: JSON.stringify({ inputs: {} }),
  });

  const responseText = await response.text();
  const responseBody = parseResponseBody(responseText);

  if (!response.ok) {
    const message = responseBody?.message ?? responseText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  console.log(
    `[${new Date().toISOString()}] ran ${workflowId}; execution id: ${
      responseBody.workflowExecutionId
    }`
  );
};

const startLoop = ({ name, workflowId, intervalMs }) => {
  const tick = () => {
    runWorkflow(workflowId).catch((error) => {
      console.error(`[${new Date().toISOString()}] failed to run ${name}: ${error.message}`);
    });
  };

  tick();
  return setInterval(tick, intervalMs);
};

console.log(
  [
    `Starting workflow runner against ${config.kibanaUrl}`,
    `space: ${config.spaceId}`,
    `child workflow: ${normalizeWorkflowId(config.childWorkflowId)} every 5s`,
    `metrics collector workflow: ${normalizeWorkflowId(
      config.metricsCollectorWorkflowId
    )} every 30m`,
  ].join('\n')
);

const intervals = [
  startLoop({
    name: 'child workflow',
    workflowId: config.childWorkflowId,
    intervalMs: 5 * SECOND_MS,
  }),
  startLoop({
    name: 'metrics collector workflow',
    workflowId: config.metricsCollectorWorkflowId,
    intervalMs: 30 * SECOND_MS,
  }),
];

const shutdown = () => {
  console.log(`\n[${new Date().toISOString()}] stopping workflow runner`);
  intervals.forEach(clearInterval);
  process.exitCode = 0;
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
