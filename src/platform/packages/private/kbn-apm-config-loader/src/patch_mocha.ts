/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent, Span, Transaction } from 'elastic-apm-node';
import { REPO_ROOT } from '@kbn/repo-info';

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
      EVENT_SUITE_BEGIN,
      EVENT_HOOK_BEGIN,
      EVENT_HOOK_END,
      EVENT_TEST_BEGIN,
      EVENT_TEST_END,
      EVENT_SUITE_END,
    } = Mocha.Runner.constants;

    const originalRunnerRun = Runner.prototype.run;

    Runner.prototype.run = function (fn: Function) {
      const runner = this;

      const fileTransactions = new Map<string, Transaction>(); // file -> transaction
      const suiteSpanMap = new WeakMap<Suite, Span>(); // suite -> span
      const spanMap = new WeakMap<Runnable, Span>(); // hook/test -> span/
      const fileSuiteCount = new Map<string, number>(); // file -> count of active suites

      function getFileName(runnable: Suite | Runnable) {
        const file = 'file' in runnable ? runnable.file : runnable.parent?.file;

        if (!file) {
          return 'unknown file';
        }
        return file.replace(REPO_ROOT, '').substring(1);
      }

      runner
        .on(EVENT_SUITE_BEGIN, function onSuiteBegin(suite: Suite) {
          if (suite.root) return;

          const file = getFileName(suite);

          // Get or create file transaction
          let fileTx = fileTransactions.get(file);
          if (!fileTx) {
            fileTx = agent.startTransaction(file, 'test.file', {
              childOf: agent.currentTraceparent ?? undefined,
            });
            fileTransactions.set(file, fileTx);
            fileSuiteCount.set(file, 0);
          }

          // Increment suite count for this file
          fileSuiteCount.set(file, (fileSuiteCount.get(file) ?? 0) + 1);

          // Create suite span within file transaction
          const suiteSpan = fileTx.startSpan(suite.fullTitle(), 'test.suite');

          if (suiteSpan) {
            suiteSpanMap.set(suite, suiteSpan);
          }
        })
        .on(EVENT_HOOK_BEGIN, function onHookBegin(hook: Runnable) {
          if (hook.parent?.root || !hook.parent) return;
          const suiteSpan = suiteSpanMap.get(hook.parent);
          if (!suiteSpan) return;
          const span = agent.startSpan(hook.title, 'suite.hook', {
            childOf: suiteSpan.traceparent,
          });
          if (span) {
            spanMap.set(hook, span);
          }
        })
        .on(EVENT_HOOK_END, function onHookEnd(hook: Runnable) {
          spanMap.get(hook)?.end();
        })
        .on(EVENT_TEST_BEGIN, function onTestBegin(test: Runnable) {
          const suiteSpan = test.parent ? suiteSpanMap.get(test.parent) : undefined;
          if (!suiteSpan) return;
          const span = agent.startSpan(test.title, 'test', { childOf: suiteSpan.traceparent });
          if (span) {
            spanMap.set(test, span);
          }
        })
        .on(EVENT_TEST_END, function onTestEnd(test: Runnable) {
          spanMap.get(test)?.end();
        })
        .on(EVENT_SUITE_END, function onSuiteEnd(suite: Suite) {
          if (suite.root) return;

          const suiteSpan = suiteSpanMap.get(suite);
          suiteSpan?.end();

          const file = getFileName(suite);

          // Decrement suite count and end file transaction if this was the last suite
          const currentCount = (fileSuiteCount.get(file) ?? 0) - 1;
          fileSuiteCount.set(file, currentCount);

          if (currentCount === 0) {
            const fileTx = fileTransactions.get(file);
            fileTx?.end();
            fileTransactions.delete(file);
            fileSuiteCount.delete(file);
          }
        });

      return originalRunnerRun.call(runner, fn);
    };

    return Mocha;
  });
}
