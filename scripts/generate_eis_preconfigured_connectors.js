#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Fetches EIS chat_completion inference endpoints from Elasticsearch and prints
 * xpack.actions.preconfigured YAML blocks for kibana.dev.yml.
 *
 * Usage:
 *   node scripts/generate_eis_preconfigured_connectors.js
 *   ELASTICSEARCH_HOST=http://localhost:9200 ELASTICSEARCH_USERNAME=elastic ELASTICSEARCH_PASSWORD=changeme node scripts/generate_eis_preconfigured_connectors.js
 *
 * Defaults: ELASTICSEARCH_HOST=http://localhost:9200, ELASTICSEARCH_USERNAME=elastic, ELASTICSEARCH_PASSWORD=changeme
 * Requires Elasticsearch with EIS/CCM connected so GET /_inference/chat_completion/_all returns endpoints.
 */

var ELASTICSEARCH_HOST =
  process.env.ELASTICSEARCH_HOST || process.env.ES_URL || 'http://localhost:9200';
var ELASTICSEARCH_USERNAME = process.env.ELASTICSEARCH_USERNAME || 'elastic';
var ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || 'changeme';

/** @typedef {{ inference_id: string, task_type: string, service: string, service_settings?: { model_id?: string } }} EisInferenceEndpoint */

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
  var withSpaces = modelId.replace(/[-._]/g, ' ');
  return (
    'EIS ' +
    withSpaces.replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    })
  );
}

/**
 * @param {EisInferenceEndpoint} endpoint
 * @returns {string} YAML block for one preconfigured connector
 */
function endpointToYaml(endpoint) {
  var modelId =
    endpoint.service_settings && endpoint.service_settings.model_id
      ? endpoint.service_settings.model_id
      : endpoint.inference_id.replace(/^\./, '').replace(/-chat_completion$/, '');
  var id = toConnectorId(modelId);
  var name = toDisplayName(modelId);
  return (
    '  ' +
    id +
    ':\n    name: ' +
    name +
    '\n    actionTypeId: .inference\n    exposeConfig: true\n    config:\n      provider: "' +
    endpoint.service +
    '"\n      taskType: "' +
    endpoint.task_type +
    '"\n      inferenceId: "' +
    endpoint.inference_id +
    '"\n      providerConfig:\n        model_id: "' +
    modelId +
    '"'
  );
}

function main() {
  var url = ELASTICSEARCH_HOST.replace(/\/$/, '') + '/_inference/chat_completion/_all';
  var auth = Buffer.from(ELASTICSEARCH_USERNAME + ':' + ELASTICSEARCH_PASSWORD, 'utf8').toString(
    'base64'
  );

  fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Basic ' + auth,
      'Content-Type': 'application/json',
    },
  })
    .then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          console.error('Elasticsearch returned ' + res.status + ': ' + text);
          process.exit(1);
        });
      }
      return res.json();
    })
    .then(function (body) {
      var endpoints = body.endpoints || [];
      if (endpoints.length === 0) {
        console.error('No chat_completion endpoints found.');
        process.exit(1);
      }
      var lines = [
        '# Paste these blocks under xpack.actions.preconfigured: in config/kibana.dev.yml',
      ];
      for (var i = 0; i < endpoints.length; i++) {
        lines.push(endpointToYaml(endpoints[i]));
      }
      console.log(lines.join('\n'));
    })
    .catch(function (err) {
      console.error('Failed to request Elasticsearch:', err.message);
      console.error(
        'Ensure ES is running and ELASTICSEARCH_HOST / ELASTICSEARCH_USERNAME / ELASTICSEARCH_PASSWORD are correct.'
      );
      process.exit(1);
    });
}

main();
