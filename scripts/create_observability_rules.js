/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable no-restricted-syntax */
require('@babel/register')({
  extensions: ['.ts', '.js'],
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
});

var createCustomThresholdRule =
  require('@kbn/observability-alerting-test-data').createCustomThresholdRule;
var createApmFailedTransactionRateRule =
  require('@kbn/observability-alerting-test-data').createApmFailedTransactionRateRule;
var createApmErrorCountRule =
  require('@kbn/observability-alerting-test-data').createApmErrorCountRule;
var createDataView = require('@kbn/observability-alerting-test-data').createDataView;
var createIndexConnector = require('@kbn/observability-alerting-test-data').createIndexConnector;

var scenario1 = require('@kbn/observability-alerting-test-data').scenario1;
var scenario2 = require('@kbn/observability-alerting-test-data').scenario2;
var scenario3 = require('@kbn/observability-alerting-test-data').scenario3;
var scenario4 = require('@kbn/observability-alerting-test-data').scenario4;
var scenario5 = require('@kbn/observability-alerting-test-data').scenario5;
var scenario6 = require('@kbn/observability-alerting-test-data').scenario6;

var senarios = [scenario1, scenario2, scenario3, scenario4, scenario5, scenario6];

async function run() {
  console.log('Creating index connector - start');
  var response = await createIndexConnector();
  var actionId = await response.data.id;
  console.log('Creating index connector - finished - actionId: ', actionId);
  for (var scenario of senarios) {
    if (scenario.dataView.shouldCreate) {
      console.log('Creating data view - start - id: ', scenario.dataView.id);
      await createDataView(scenario.dataView);
      console.log('Creating data view - finished - id: ', scenario.dataView.id);
    }
    console.log('Creating Custom threshold rule - start - name: ', scenario.ruleParams.name);
    await createCustomThresholdRule(actionId, scenario.dataView.id, scenario.ruleParams);
    console.log('Creating Custom threshold rule - finished - name: ', scenario.ruleParams.name);
  }

  console.log('Creating APM error count rule - start');
  await createApmErrorCountRule(actionId);
  console.log('Creating APM error count rule - finished');

  console.log('Creating APM failed transaction rate rule - start');
  await createApmFailedTransactionRateRule(actionId);
  console.log('Creating APM failed transaction rate rule - finished');
}

run();
