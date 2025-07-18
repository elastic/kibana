/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../src/setup_node_env');
require('elastic-apm-node').addPatch(
  ['mocha'],
  function (/** @type {typeof import('mocha')} */ Mocha, agent) {
    var Runner = Mocha.Runner;

    Mocha.Runner.constants;

    var originalRunnerRun = Runner.prototype.run;

    Runner.prototype.run = function (fn) {
      var runner = this;

      var suiteTx = new WeakMap();
      var spanMap = new WeakMap();

      runner
        .on(Mocha.Runner.constants.EVENT_SUITE_BEGIN, function onSuiteBegin(suite) {
          if (suite.root) return; // ignore the invisible root
          var tx = agent.startTransaction(suite.fullTitle(), 'test.suite', {
            childOf: agent.currentTraceparent,
          });
          suiteTx.set(suite, tx);
        })
        .on(Mocha.Runner.constants.EVENT_HOOK_BEGIN, function onHookBegin(hook) {
          if (hook.parent.root) return; // root hooks are global, ignore
          var tx = suiteTx.get(hook.parent);
          if (!tx) return;
          var span = tx.startSpan(hook.title, 'suite.hook');
          spanMap.set(hook, span);
        })
        .on(Mocha.Runner.constants.EVENT_HOOK_END, function onHookEnd(hook) {
          spanMap.get(hook)?.end();
        })
        .on(Mocha.Runner.constants.EVENT_TEST_BEGIN, function onTestBegin(test) {
          var tx = suiteTx.get(test.parent); // parent suite’s Tx
          var span = tx.startSpan(test.title, 'test');
          spanMap.set(test, span);
        })
        .on(Mocha.Runner.constants.EVENT_TEST_END, function onTestEnd(test) {
          spanMap.get(test)?.end();
        })
        .on(Mocha.Runner.constants.EVENT_SUITE_END, function onSuiteEnd(suite) {
          suiteTx.get(suite)?.end();
          suiteTx.delete(suite);
        });

      return originalRunnerRun.call(runner, fn);
    };

    return Mocha;
  }
);
require('../src/cli/apm')('functional-test-runner', process.argv);
require('@kbn/test').runFtrCli();
