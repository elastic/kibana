/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Agent, Span, Transaction } from 'elastic-apm-node';

interface Runnable {
  parent?: Suite;
  title: string;
}

interface Suite extends Runnable {
  root: boolean;
  file?: string;
  fullTitle: () => string;
}

export function patchMocha(agent: Agent) {
  agent.addPatch('mocha', (Mocha: any) => {
    const Runner = Mocha.Runner;

    const {
      EVENT_RUN_BEGIN,
      EVENT_RUN_END,
      EVENT_SUITE_BEGIN,
      EVENT_SUITE_END,
      EVENT_HOOK_BEGIN,
      EVENT_HOOK_END,
      EVENT_TEST_BEGIN,
      EVENT_TEST_END,
    } = Mocha.Runner.constants;

    const originalRunnerRun = Runner.prototype.run;

    Runner.prototype.run = function (fn: Function) {
      const runner = this;

      let testRunTransaction: Transaction | null = null;
      const suiteTransactionMap = new WeakMap<Suite, Transaction>(); // suite -> transaction
      const testSpanMap = new WeakMap<Runnable, Span>(); // test -> span
      const hookSpanMap = new WeakMap<Runnable, Span>(); // hook -> span

      function findParentSuiteTransaction(suite: Suite): Transaction | null {
        if (suite.parent && !suite.parent.root) {
          return suiteTransactionMap.get(suite.parent) || findParentSuiteTransaction(suite.parent);
        }
        return testRunTransaction;
      }

      function findParentSuiteTransactionForTest(test: Runnable): Transaction | null {
        if (test.parent) {
          return suiteTransactionMap.get(test.parent) || findParentSuiteTransaction(test.parent);
        }
        return testRunTransaction;
      }

      runner
        .on(EVENT_RUN_BEGIN, function onRunBegin() {
          testRunTransaction = agent.startTransaction('test_run', 'test_run', {
            childOf: agent.currentTraceparent ?? undefined,
          });
        })
        .on(EVENT_RUN_END, function onRunEnd() {
          testRunTransaction?.end();
          testRunTransaction = null;
        })
        .on(EVENT_SUITE_BEGIN, function onSuiteBegin(suite: Suite) {
          // Skip root suite
          if (suite.root) return;

          const parentTransaction = findParentSuiteTransaction(suite);
          if (!parentTransaction) return;

          const suiteTransaction = agent.startTransaction(suite.fullTitle(), 'suite', {
            childOf: parentTransaction,
          });

          if (suiteTransaction) {
            suiteTransactionMap.set(suite, suiteTransaction);
          }
        })
        .on(EVENT_SUITE_END, function onSuiteEnd(suite: Suite) {
          // Skip root suite
          if (suite.root) return;

          const suiteTransaction = suiteTransactionMap.get(suite);
          suiteTransaction?.end();
          suiteTransactionMap.delete(suite);
        })
        .on(EVENT_HOOK_BEGIN, function onHookBegin(hook: Runnable) {
          if (hook.parent?.root || !hook.parent) return;

          const parentTransaction = suiteTransactionMap.get(hook.parent);
          if (!parentTransaction) return;

          const hookSpan = agent.startSpan(
            hook.parent.fullTitle() + ' ' + hook.title,
            'suite.hook',
            {
              childOf: parentTransaction,
            }
          );

          if (hookSpan) {
            hookSpanMap.set(hook, hookSpan);
          }
        })
        .on(EVENT_HOOK_END, function onHookEnd(hook: Runnable) {
          const hookSpan = hookSpanMap.get(hook);
          hookSpan?.end();
          hookSpanMap.delete(hook);
        })
        .on(EVENT_TEST_BEGIN, function onTestBegin(test: Runnable) {
          const parentTransaction = findParentSuiteTransactionForTest(test);
          if (!parentTransaction) return;

          const testSpan = agent.startSpan(test.title, 'test', {
            childOf: parentTransaction,
          });

          if (testSpan) {
            testSpanMap.set(test, testSpan);
          }
        })
        .on(EVENT_TEST_END, function onTestEnd(test: Runnable) {
          const testSpan = testSpanMap.get(test);
          testSpan?.end();
          testSpanMap.delete(test);
        });

      return originalRunnerRun.call(runner, fn);
    };

    return Mocha;
  });
}
