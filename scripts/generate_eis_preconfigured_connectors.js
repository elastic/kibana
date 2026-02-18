#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use it except in compliance with the Elastic License 2.0.
 */

/**
 * Fetches EIS chat_completion inference endpoints from Elasticsearch and prints
 * xpack.actions.preconfigured YAML blocks for kibana.dev.yml.
 *
 * Usage:
 *   node scripts/generate_eis_preconfigured_connectors.js
 *   ES_URL=http://localhost:9200 ES_AUTH=elastic:changeme node scripts/generate_eis_preconfigured_connectors.js
 *
 * Defaults: ES_URL=http://localhost:9200, ES_AUTH=elastic:changeme
 * Requires Elasticsearch with EIS/CCM connected so GET /_inference/chat_completion/_all returns endpoints.
 */

const ES_URL = process.env.ES_URL || 'http://localhost:9200';
const ES_AUTH = process.env.ES_AUTH || 'elastic:changeme';

/** @typedef {{ inference_id: string, task_type: string, service: string, service_settings?: { model_id?: string } }} Endpoint */

/**
 * @param {string} modelId
 * @returns {string} YAML-safe key (lowercase, alphanumeric + hyphens)
 */
function toConnectorId(modelId) {
  return modelId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * @param {string} modelId
 * @returns {string} Human-readable name for the connector
 */
function toDisplayName(modelId) {
  const withSpaces = modelId.replace(/[-._]/g, ' ');
  return 'EIS ' + withSpaces.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {Endpoint} ep
 * @returns {string} YAML block for one preconfigured connector
 */
function endpointToYaml(ep) {
  const modelId =
    ep.service_settings?.model_id ||
    ep.inference_id.replace(/^\./, '').replace(/-chat_completion$/, '');
  const id = toConnectorId(modelId);
  const name = toDisplayName(modelId);
  return `  ${id}:
    name: ${name}
    actionTypeId: .inference
    exposeConfig: true
    config:
      provider: "${ep.service}"
      taskType: "${ep.task_type}"
      inferenceId: "${ep.inference_id}"
      providerConfig:
        model_id: "${modelId}"`;
}

async function main() {
  const url = `${ES_URL.replace(/\/$/, '')}/_inference/chat_completion/_all`;
  const auth = Buffer.from(ES_AUTH, 'utf8').toString('base64');

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Failed to request Elasticsearch:', err.message);
    console.error('Ensure ES is running and ES_URL/ES_AUTH are correct.');
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`Elasticsearch returned ${res.status}: ${text}`);
    process.exit(1);
  }

  /** @type {{ endpoints?: Endpoint[] }} */
  const body = await res.json();
  const endpoints = body.endpoints || [];

  if (endpoints.length === 0) {
    console.error('No chat_completion endpoints found.');
    process.exit(1);
  }

  const lines = [
    '# Paste these blocks under xpack.actions.preconfigured: in config/kibana.dev.yml',
    ...endpoints.map(endpointToYaml),
  ];
  console.log(lines.join('\n'));
}

main();
