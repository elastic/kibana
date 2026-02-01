/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Worker } from 'worker_threads';
import { checkForTripleQuotesAndEsqlQuery, unescapeInvalidChars } from './autocomplete_utils';

type QueryCheckResult = ReturnType<typeof checkForTripleQuotesAndEsqlQuery>;

interface WorkerReadyMessage {
  type: 'ready';
}

interface WorkerResultSuccessMessage {
  type: 'result';
  ok: true;
  ms: number;
  result: QueryCheckResult;
}

interface WorkerResultErrorMessage {
  type: 'result';
  ok: false;
  error: string;
  stack?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isWorkerReadyMessage = (value: unknown): value is WorkerReadyMessage =>
  isRecord(value) && value.type === 'ready';

const isWorkerResultMessage = (
  value: unknown
): value is WorkerResultSuccessMessage | WorkerResultErrorMessage =>
  isRecord(value) && value.type === 'result' && typeof value.ok === 'boolean';

interface CheckForTripleQuotesPerfWorker {
  measure(request: string, timeoutMs: number): Promise<{ ms: number; result: QueryCheckResult }>;
  terminate(): Promise<void>;
}

const createCheckForTripleQuotesPerfWorker = async (): Promise<CheckForTripleQuotesPerfWorker> => {
  const autocompleteUtilsPath = require.resolve('./autocomplete_utils');

  const worker = new Worker(
    `
      const { parentPort } = require('worker_threads');
      require('@kbn/setup-node-env');

      const { performance } = require('perf_hooks');
      const { checkForTripleQuotesAndEsqlQuery } = require(${JSON.stringify(
        autocompleteUtilsPath
      )});

      parentPort.on('message', ({ request }) => {
        try {
          const t0 = performance.now();
          const result = checkForTripleQuotesAndEsqlQuery(request);
          const t1 = performance.now();
          parentPort.postMessage({ type: 'result', ok: true, ms: t1 - t0, result });
        } catch (e) {
          parentPort.postMessage({
            type: 'result',
            ok: false,
            error: e && e.message ? e.message : String(e),
            stack: e && e.stack ? e.stack : undefined,
          });
        }
      });

      parentPort.postMessage({ type: 'ready' });
    `,
    { eval: true }
  );

  const waitForMessageOnce = async (timeoutMs: number, timeoutMessage: string) => {
    return await new Promise<unknown>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timer);
        worker.off('message', onMessage);
        worker.off('error', onError);
      };

      const onMessage = (msg: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(msg);
      };

      const onError = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        void worker.terminate();
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      worker.once('message', onMessage);
      worker.once('error', onError);
    });
  };

  const ready = await waitForMessageOnce(10_000, 'perf worker did not become ready after 10000ms');
  if (!isWorkerReadyMessage(ready)) {
    await worker.terminate();
    throw new Error(`unexpected perf worker ready message: ${JSON.stringify(ready)}`);
  }

  return {
    measure: async (request: string, timeoutMs: number) => {
      worker.postMessage({ request });

      const msg = await waitForMessageOnce(timeoutMs, `perf worker timed out after ${timeoutMs}ms`);
      if (!isWorkerResultMessage(msg)) {
        throw new Error(`unexpected perf worker response: ${JSON.stringify(msg)}`);
      }

      if (!msg.ok) {
        const error = msg.error;
        const stack = msg.stack;
        throw new Error(stack ? `${error}\n${stack}` : error);
      }

      return { ms: msg.ms, result: msg.result };
    },
    terminate: async () => {
      await worker.terminate();
    },
  };
};

describe('autocomplete_utils', () => {
  describe('checkForTripleQuotesAndQueries', () => {
    it('returns false for all flags for an empty string', () => {
      expect(checkForTripleQuotesAndEsqlQuery('')).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns false for all flags for a request without triple quotes or ESQL query', () => {
      const request = `POST _search\n{\n  "query": {\n    "match": {\n      "message": "hello world"\n    }\n  }\n}`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns true for insideTripleQuotes and false for ESQL flags when triple quotes are outside a query', () => {
      const request = `POST _ingest/pipeline/_simulate\n{\n  "pipeline": {\n    "processors": [\n      {\n        "script": {\n          "source":\n          """\n            for (field in params['fields']){\n                if (!$(field, '').isEmpty()){\n`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: true,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns true for insideTripleQuotes but false for ESQL flags inside a non-_query request query field', () => {
      const request = `POST _search\n{\n  "query": """FROM test `;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: true,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns false for ESQL flags inside a single-quoted query for non-_query request', () => {
      const request = `GET index/_search\n{\n  "query": "SELECT * FROM logs `;
      const result = checkForTripleQuotesAndEsqlQuery(request);
      expect(result).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns false for all flags if single quote is closed', () => {
      const request = `POST _query\n{\n  "query": "SELECT * FROM logs" }`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns false for all flags if triple quote is closed', () => {
      const request = `POST _query\n{\n  "query": """SELECT * FROM logs""" }`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('has roughly linear runtime scaling (performance regression)', async () => {
      // NOTE: Absolute timing thresholds are flaky on shared CI. This test instead checks
      // *relative scaling* on a constructed input that is adversarial for the old
      // (regex-per-quote) implementation (many unescaped quotes), so accidental
      // super-linear regressions are more likely to be caught.
      //
      // To keep this test preemptible (and avoid hanging Jest on a severe regression),
      // it runs the measurement in a separate worker thread with a hard timeout.
      const median = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      };

      const buildManyJsonPairs = (pairCount: number) => {
        const pairs: string[] = [];
        for (let i = 0; i < pairCount; i++) {
          pairs.push(`"k${i}":"v${i}"`);
        }
        return `{${pairs.join(',')}}`;
      };

      const perf = await createCheckForTripleQuotesPerfWorker();
      const measure = async (pairCount: number) => {
        // Building the string can be non-trivial; exclude it from the timed section.
        const request = `POST _search\n${buildManyJsonPairs(pairCount)}`;
        const { ms, result } = await perf.measure(request, 1_000);

        // correctness (still important)
        expect(result).toEqual({
          insideTripleQuotes: false,
          insideEsqlQuery: false,
          esqlQueryIndex: -1,
        });

        return ms;
      };

      try {
        // warmup (JIT)
        await measure(250);

        // Keep sizes small enough that the pre-optimization implementation fails fast (bad scaling)
        // rather than effectively hanging the test runtime.
        const tSmall = median([await measure(500), await measure(500), await measure(500)]);
        const tLarge = median([await measure(1_000), await measure(1_000), await measure(1_000)]);

        // Linear would be ~2x. Allow some noise/GC: fail only if it's far worse.
        expect(tLarge / tSmall).toBeLessThan(3.25);
      } finally {
        await perf.terminate();
      }
    }, 20_000);
  });

  it('sets insideEsqlQuery for single quoted query after POST _query', () => {
    const request = `POST    _query\n{\n  "query": "FROM test `;
    expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM test ') + 1,
    });
  });

  it('sets insideEsqlQuery for triple quoted query after POST _query (case-insensitive)', () => {
    const request = `post _query\n{\n  "query": """FROM test `; // lowercase POST should also match
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: true,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"""') + 3,
    });
  });

  it('detects single quoted query after POST _query?pretty suffix', () => {
    const request = `POST _query?pretty\n{\n  "query": "FROM logs | STATS `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
    });
  });

  it('detects query with /_query endpoint', () => {
    const request = `POST /_query\n{\n  "query": "FROM logs | STATS `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
    });
  });

  it('detects triple quoted query after POST   _query?foo=bar with extra spaces', () => {
    const request = `POST   _query?foo=bar\n{\n  "query": """FROM metrics `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: true,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"""') + 3,
    });
  });

  it('does not set ESQL flags for subsequent non-_query request in same buffer', () => {
    const request = `POST _query\n{\n  "query": "FROM a | STATS "\n}\nGET other_index/_search\n{\n  "query": "match_all" }`;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: false,
      esqlQueryIndex: -1, // single quotes closed in second request
    });
  });

  it('only flags current active _query section in mixed multi-request buffer', () => {
    const partial = `POST _query\n{\n  "query": "FROM a | STATS "\n}\nPOST _query\n{\n  "query": """FROM b | WHERE foo = `; // cursor inside triple quotes of second request
    const result = checkForTripleQuotesAndEsqlQuery(partial);
    expect(result).toEqual({
      insideTripleQuotes: true,
      insideEsqlQuery: true,
      esqlQueryIndex: partial.lastIndexOf('"""') + 3,
    });
  });

  it('handles request method at end of buffer without trailing newline (regression test)', () => {
    const buffer = 'POST _query';
    const result = checkForTripleQuotesAndEsqlQuery(buffer);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: false,
      esqlQueryIndex: -1,
    });
  });

  describe('unescapeInvalidChars', () => {
    it('should return the original string if there are no escape sequences', () => {
      const input = 'simple string';
      expect(unescapeInvalidChars(input)).toBe('simple string');
    });

    it('should unescape escaped double quotes', () => {
      const input = '\\"hello\\"';
      expect(unescapeInvalidChars(input)).toBe('"hello"');
    });

    it('should unescape escaped backslashes', () => {
      const input = 'path\\\\to\\\\file';
      expect(unescapeInvalidChars(input)).toBe('path\\to\\file');
    });

    it('should unescape both escaped backslashes and quotes', () => {
      const input = 'say: \\"hello\\" and path: C:\\\\Program Files\\\\App';
      expect(unescapeInvalidChars(input)).toBe('say: "hello" and path: C:\\Program Files\\App');
    });

    it('should handle mixed content correctly', () => {
      const input = 'log: \\"User \\\\\\"admin\\\\\\" logged in\\"';
      expect(unescapeInvalidChars(input)).toBe('log: "User \\"admin\\" logged in"');
    });

    it('should leave already unescaped characters alone', () => {
      const input = '"already unescaped" \\ and /';
      expect(unescapeInvalidChars(input)).toBe('"already unescaped" \\ and /');
    });

    it('should not over-unescape multiple backslashes', () => {
      const input = '\\\\\\\\"test\\\\"';
      // \\\\"test\\" becomes \\"test\"
      expect(unescapeInvalidChars(input)).toBe('\\\\"test\\"');
    });
  });
});
