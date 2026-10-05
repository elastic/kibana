/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../fixtures';
import { cleanupWorkflowsAndRules } from '../fixtures/cleanup';
import { getInfosecDemoWorkflowYaml, getLargePerfWorkflowYaml } from '../fixtures/workflows';

interface MarkerCallRecord {
  source: string;
  markerCount: number;
  offsetMs: number;
  durationMs: number;
}

interface EditCycleResult {
  editSyncMs: number;
  markerCalls: MarkerCallRecord[];
  totalMarkerCascadeMs: number;
  totalMarkerWorkMs: number;
  markerCallCount: number;
}

interface LongFrameEntry {
  duration: number;
  blockingDuration: number;
  scripts: Array<{
    sourceURL: string;
    sourceFunctionName: string;
    invoker: string;
    duration: number;
  }>;
}

const WORKFLOW_CASES = [
  { name: 'large_perf (87 steps, 431 vars)', getYaml: getLargePerfWorkflowYaml },
  { name: 'infosec_demo (150 steps, 361 vars)', getYaml: getInfosecDemoWorkflowYaml },
] as const;

async function waitForValidationToSettle(
  validationAccordion: import('@kbn/scout').Locator
): Promise<void> {
  await expect(async () => {
    const text = await validationAccordion.innerText();
    if (!text.includes('error') && !text.includes('No validation errors')) {
      throw new Error('Validation not settled yet');
    }
  }).toPass({ timeout: 15_000 });
}

const MARKER_QUIESCENCE_MS = 2000;
const MARKER_MAX_WAIT_MS = 15000;

/**
 * Number of edit→settle→undo cycles per test. The minimum across cycles is used for assertions.
 * Contention can only inflate a sample, so the minimum is a better estimator of true cost.
 */
const MARKER_CYCLES = 3;

/**
 * Self-calibrated budget constants. See the Jest companion for full documentation:
 * public/features/validate_workflow_yaml/lib/use_yaml_validation.perf.test.ts
 */
const BUDGET_MULTIPLIER = 3;
const FLOOR_MS = 20;

test.describe(
  'Workflow editor: validation performance',
  {
    // Local-only: on Cloud the marker cascade lands behind network-bound ESQL validation.
    tag: [
      '@local-stateful-classic',
      '@local-serverless-observability_complete',
      '@local-serverless-security_complete',
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsPrivilegedUser();

      // Stub ES|QL network requests — this suite measures client CPU and frame time,
      // not network latency. Without stubs, infosec_demo triggers ~160 sequential
      // HTTP round trips per validation run; on Cloud each RTT is 650–900 ms, which
      // exceeds the 15 s marker deadline. Stubs return the same empty responses as a
      // local stack (cross-cluster indices don't exist locally either), so the marker
      // counts and client work the budgets were set on are unchanged.
      await page.route('**/internal/esql/autocomplete/sources/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      );
      await page.route('**/api/fleet/epm/packages/installed*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        })
      );
      // 400 causes getEsqlColumns (kbn-esql-utils/src/utils/callbacks/columns.ts:56) to
      // catch and return [], matching what happens locally when the index doesn't exist.
      await page.route('**/internal/search/esql_async**', (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: { type: 'index_not_found_exception' } }),
        })
      );
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    for (const { name, getYaml } of WORKFLOW_CASES) {
      test(`[${name}] setModelMarkers cascade completes within frame budget after edit`, async ({
        apiServices,
        pageObjects,
        page,
        log,
      }) => {
        // Seed via API so useYamlValidation starts with isLoading=true — no stale
        // settled text from another YAML is ever on screen for waitForValidationToSettle
        // to match prematurely (R2).
        const yaml = getYaml();
        const { id } = await apiServices.workflows.create(yaml);
        await pageObjects.workflowEditor.gotoWorkflow(id);
        await waitForValidationToSettle(pageObjects.workflowEditor.validationErrorsAccordion);

        const quiescenceMs = MARKER_QUIESCENCE_MS;
        const maxWaitMs = MARKER_MAX_WAIT_MS;

        // Measure how fast this browser instance is right now. Same workload as the Jest
        // calibration so the two suites share the same "units" concept.
        const calibrationMs = await page.evaluate(() => {
          function calibrationWorkload(): void {
            const counts = new Map<string, number>();
            let tail = '';
            for (let i = 0; i < 20_000; i++) {
              const key = `k${i % 997}`;
              counts.set(key, (counts.get(key) ?? 0) + Math.sqrt(i));
              if (i % 100 === 0) tail = `${tail}${key}`.slice(-64);
            }
            if (tail.length === 0 || counts.size === 0) throw new Error('dead-code-eliminated');
          }
          const WARMUP = 5;
          const SAMPLES = 10;
          for (let i = 0; i < WARMUP; i++) calibrationWorkload();
          const times: number[] = [];
          for (let i = 0; i < SAMPLES; i++) {
            const t = performance.now();
            calibrationWorkload();
            times.push(performance.now() - t);
          }
          return Math.max(Math.min(...times), 0.01);
        });
        log.info(`Browser calibration: ${calibrationMs.toFixed(3)} ms/unit`);

        // Run MARKER_CYCLES edit→settle→undo cycles; assert on the element-wise minimum.
        // This removes the single-sample luck problem while keeping the same quiescence mechanism.
        const cycleResults: EditCycleResult[] = [];
        for (let cycle = 0; cycle < MARKER_CYCLES; cycle++) {
          if (cycle > 0) {
            // Let validation settle after the previous undo before the next edit.
            await waitForValidationToSettle(pageObjects.workflowEditor.validationErrorsAccordion);
          }
          cycleResults.push(
            await page.evaluate(
              ({ quiescence, maxWait }) => {
                return new Promise<EditCycleResult>((resolve, reject) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const monacoEnv = (window as any).MonacoEnvironment;
                  const editorEl = document.querySelector('.monaco-editor[data-uri]');
                  if (!editorEl || !monacoEnv?.monaco?.editor) {
                    throw new Error('Monaco editor not available');
                  }
                  const dataUri = editorEl.getAttribute('data-uri');
                  if (!dataUri) {
                    throw new Error('Editor data-uri attribute not found');
                  }
                  const model = monacoEnv.monaco.editor.getModel(dataUri);
                  const editors = monacoEnv.monaco.editor.getEditors();

                  const editor = editors.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (e: any) => e.getModel()?.uri?.toString() === model.uri.toString()
                  );

                  if (!model || !editor) {
                    throw new Error('Editor model or instance not found');
                  }

                  const markerCalls: MarkerCallRecord[] = [];
                  const origSetModelMarkers = monacoEnv.monaco.editor.setModelMarkers.bind(
                    monacoEnv.monaco.editor
                  );
                  let editTimestamp = 0;
                  let syncEditMs = 0;
                  let quiescenceTimer: ReturnType<typeof setTimeout> | null = null;
                  let maxTimer: ReturnType<typeof setTimeout> | null = null;
                  let settled = false;

                  function finish() {
                    if (settled) {
                      return;
                    }
                    settled = true;
                    if (quiescenceTimer) {
                      clearTimeout(quiescenceTimer);
                    }
                    if (maxTimer) {
                      clearTimeout(maxTimer);
                    }
                    monacoEnv.monaco.editor.setModelMarkers = origSetModelMarkers;
                    editor.trigger('perf-test', 'undo', null);

                    // A cycle with no marker calls means validation never ran — reject rather
                    // than resolve with zeros, which would make a regression look like the best
                    // possible performance when combined with Math.min across cycles.
                    if (markerCalls.length === 0) {
                      reject(
                        new Error('No setModelMarkers calls observed — validation did not run')
                      );
                      return;
                    }

                    const firstCall = markerCalls.length > 0 ? markerCalls[0].offsetMs : 0;
                    const lastCall =
                      markerCalls.length > 0
                        ? markerCalls[markerCalls.length - 1].offsetMs +
                          markerCalls[markerCalls.length - 1].durationMs
                        : 0;

                    const totalWork = markerCalls.reduce(
                      (sum: number, c: MarkerCallRecord) => sum + c.durationMs,
                      0
                    );
                    resolve({
                      editSyncMs: syncEditMs,
                      markerCalls,
                      totalMarkerCascadeMs: Number((lastCall - firstCall).toFixed(2)),
                      totalMarkerWorkMs: Number(totalWork.toFixed(2)),
                      markerCallCount: markerCalls.length,
                    });
                  }

                  monacoEnv.monaco.editor.setModelMarkers = (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    m: any,
                    source: string,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    markers: any[]
                  ) => {
                    const callStart = performance.now();
                    const markerResult = origSetModelMarkers(m, source, markers);
                    const callEnd = performance.now();
                    if (editTimestamp > 0) {
                      markerCalls.push({
                        source,
                        markerCount: markers.length,
                        offsetMs: Number((callStart - editTimestamp).toFixed(2)),
                        durationMs: Number((callEnd - callStart).toFixed(2)),
                      });
                      if (quiescenceTimer) {
                        clearTimeout(quiescenceTimer);
                      }
                      quiescenceTimer = setTimeout(finish, quiescence);
                    }
                    return markerResult;
                  };

                  const ln = 30;
                  const content = model.getLineContent(ln);
                  editTimestamp = performance.now();

                  editor.executeEdits('perf-test', [
                    {
                      range: {
                        startLineNumber: ln,
                        startColumn: content.length + 1,
                        endLineNumber: ln,
                        endColumn: content.length + 1,
                      },
                      text: ' {{ steps.http_step_0.output }}',
                    },
                  ]);

                  syncEditMs = Number((performance.now() - editTimestamp).toFixed(2));

                  // Only the deadline timer runs here. The quiescence timer starts inside
                  // the setModelMarkers interceptor after the first call arrives, so it never
                  // fires before validation has begun. Without this, a slow CI agent where
                  // validation takes > quiescence ms to start would trigger finish() with an
                  // empty markerCalls before any measurement was taken.
                  maxTimer = setTimeout(finish, maxWait);
                });
              },
              { quiescence: quiescenceMs, maxWait: maxWaitMs }
            )
          );
        }

        // Log each cycle for debugging.
        for (const [i, r] of cycleResults.entries()) {
          const worstCall =
            r.markerCalls.length > 0 ? Math.max(...r.markerCalls.map((c) => c.durationMs)) : 0;
          log.info(
            `[Cycle ${i + 1}/${MARKER_CYCLES}] editSync: ${r.editSyncMs}ms, ` +
              `totalMarkerWork: ${r.totalMarkerWorkMs}ms, calls: ${r.markerCallCount}, ` +
              `worstCall: ${worstCall.toFixed(2)}ms`
          );
          log.info(`  call details: ${JSON.stringify(r.markerCalls, null, 2)}`);
        }

        const minEditSyncMs = Math.min(...cycleResults.map((r) => r.editSyncMs));
        const minTotalMarkerWorkMs = Math.min(...cycleResults.map((r) => r.totalMarkerWorkMs));
        // "Worst call in best cycle": max durationMs within each cycle, min across cycles.
        const minWorstCallMs = Math.min(
          ...cycleResults.map((r) =>
            r.markerCalls.length > 0 ? Math.max(...r.markerCalls.map((c) => c.durationMs)) : 0
          )
        );

        log.info(
          `Min-of-${MARKER_CYCLES} — editSync: ${minEditSyncMs}ms, ` +
            `totalMarkerWork: ${minTotalMarkerWorkMs}ms, worstCall: ${minWorstCallMs}ms ` +
            `(derived units: editSync=${(minEditSyncMs / calibrationMs).toFixed(2)}, ` +
            `totalWork=${(minTotalMarkerWorkMs / calibrationMs).toFixed(2)}, ` +
            `worstCall=${(minWorstCallMs / calibrationMs).toFixed(2)})`
        );

        /**
         * Unit estimates — measure locally by running this suite against a stack and reading
         * the "derived units" values from the log output above, then updating these constants.
         *
         * editSyncMs: synchronous Monaco executeEdits; local estimate ≈ 5ms → 2 units.
         *   ceiling = Math.max(2 × calMs × 3, 20ms). FLOOR_MS=20ms is the binding constraint.
         * totalMarkerWorkMs: sum of all setModelMarkers durations; local estimate ≈ 50ms → 19 units.
         *   ceiling = Math.max(19 × calMs × 3, 20ms).
         * worstCallMs: slowest individual setModelMarkers ("esql" failed at 168ms on CI, #268541).
         *   local estimate ≈ 30ms → 12 units. ceiling = Math.max(12 × calMs × 3, 20ms).
         */
        const editSyncCeiling = Math.max(2 * calibrationMs * BUDGET_MULTIPLIER, FLOOR_MS);
        const totalMarkerWorkCeiling = Math.max(19 * calibrationMs * BUDGET_MULTIPLIER, FLOOR_MS);
        const worstCallCeiling = Math.max(12 * calibrationMs * BUDGET_MULTIPLIER, FLOOR_MS);

        expect(
          minEditSyncMs,
          `Synchronous edit time (min-of-${MARKER_CYCLES}: ${minEditSyncMs}ms) ` +
            `should be under ${editSyncCeiling.toFixed(2)}ms (2 units × ${calibrationMs.toFixed(
              3
            )}ms × ${BUDGET_MULTIPLIER})`
        ).toBeLessThan(editSyncCeiling);

        expect(
          minTotalMarkerWorkMs,
          `Total setModelMarkers work (min-of-${MARKER_CYCLES}: ${minTotalMarkerWorkMs}ms) ` +
            `should be under ${totalMarkerWorkCeiling.toFixed(
              2
            )}ms (19 units × ${calibrationMs.toFixed(3)}ms × ${BUDGET_MULTIPLIER})`
        ).toBeLessThan(totalMarkerWorkCeiling);

        expect(
          minWorstCallMs,
          `Slowest setModelMarkers call (min-of-${MARKER_CYCLES} worst: ${minWorstCallMs}ms) ` +
            `should be under ${worstCallCeiling.toFixed(2)}ms (12 units × ${calibrationMs.toFixed(
              3
            )}ms × ${BUDGET_MULTIPLIER})`
        ).toBeLessThan(worstCallCeiling);
      });

      test(`[${name}] frame rate stays above threshold during rapid edits`, async ({
        apiServices,
        config,
        pageObjects,
        page,
        log,
      }) => {
        // Seed via API — same reason as the cascade test (R2).
        const yaml = getYaml();
        const { id } = await apiServices.workflows.create(yaml);
        await pageObjects.workflowEditor.gotoWorkflow(id);
        await waitForValidationToSettle(pageObjects.workflowEditor.validationErrorsAccordion);

        const settleMs = MARKER_QUIESCENCE_MS;
        const maxWaitMs = MARKER_MAX_WAIT_MS;

        const frameStats = await page.evaluate(
          ({ settle, maxWait }) => {
            const EDIT_COUNT = 40;
            const EDIT_INTERVAL_MS = 30;

            return new Promise<{
              totalFrames: number;
              droppedFrames: number;
              jankFrames: number;
              p95Ms: number;
              maxMs: number;
              worst5: number[];
              markerCascadesDuringEdits: number;
              longFrames: LongFrameEntry[];
            }>((resolve) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const monacoEnv = (window as any).MonacoEnvironment;
              const editorEl = document.querySelector('.monaco-editor[data-uri]');
              if (!editorEl || !monacoEnv?.monaco?.editor) {
                throw new Error('Monaco editor not available');
              }
              const dataUri = editorEl.getAttribute('data-uri');
              if (!dataUri) {
                throw new Error('Editor data-uri attribute not found');
              }
              const model = monacoEnv.monaco.editor.getModel(dataUri);
              const editors = monacoEnv.monaco.editor.getEditors();

              const editor = editors.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (e: any) => e.getModel()?.uri?.toString() === model.uri.toString()
              );

              if (!model || !editor) {
                throw new Error('Editor model or instance not found');
              }

              // Observe long-animation-frame entries (R3 attribution). Feature-detected
              // because the API is not universally available yet. Entries of >= 1 s are
              // logged to help attribute stalls when the 4000 ms net fires on Cloud.
              const longFrames: LongFrameEntry[] = [];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let loafObserver: any = null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const loafSupported = (PerformanceObserver as any).supportedEntryTypes?.includes(
                'long-animation-frame'
              );
              if (typeof PerformanceObserver !== 'undefined' && loafSupported) {
                loafObserver = new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const e = entry as any;
                    if (e.duration >= 1000) {
                      const scripts = (
                        (e.scripts ?? []) as Array<{
                          sourceURL: string;
                          sourceFunctionName: string;
                          invoker: string;
                          duration: number;
                        }>
                      )
                        .sort(
                          (a: { duration: number }, b: { duration: number }) =>
                            b.duration - a.duration
                        )
                        .slice(0, 5)
                        .map(
                          (s: {
                            sourceURL: string;
                            sourceFunctionName: string;
                            invoker: string;
                            duration: number;
                          }) => ({
                            sourceURL: s.sourceURL ?? '',
                            sourceFunctionName: s.sourceFunctionName ?? '',
                            invoker: s.invoker ?? '',
                            duration: Number((s.duration ?? 0).toFixed(1)),
                          })
                        );
                      longFrames.push({
                        duration: Number(e.duration.toFixed(1)),
                        blockingDuration: Number((e.blockingDuration ?? 0).toFixed(1)),
                        scripts,
                      });
                    }
                  }
                });
                loafObserver.observe({ type: 'long-animation-frame' });
              }

              let markerCascadesDuringEdits = 0;
              const origSetModelMarkers = monacoEnv.monaco.editor.setModelMarkers.bind(
                monacoEnv.monaco.editor
              );
              monacoEnv.monaco.editor.setModelMarkers = (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                m: any,
                source: string,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                markers: any[]
              ) => {
                markerCascadesDuringEdits++;
                return origSetModelMarkers(m, source, markers);
              };

              const frameDeltas: number[] = [];
              let lastFrame = performance.now();
              let rafRunning = true;

              function measureFrame() {
                if (!rafRunning) {
                  return;
                }
                const now = performance.now();
                frameDeltas.push(now - lastFrame);
                lastFrame = now;
                requestAnimationFrame(measureFrame);
              }
              requestAnimationFrame(measureFrame);

              let editIdx = 0;
              const totalLines = model.getLineCount();
              let quiescenceTimer: ReturnType<typeof setTimeout> | null = null;
              let frameSettled = false;

              function finish() {
                if (frameSettled) {
                  return;
                }
                frameSettled = true;
                if (quiescenceTimer) {
                  clearTimeout(quiescenceTimer);
                }
                rafRunning = false;
                monacoEnv.monaco.editor.setModelMarkers = origSetModelMarkers;
                if (loafObserver) {
                  loafObserver.disconnect();
                }

                for (let i = 0; i < EDIT_COUNT; i++) {
                  editor.trigger('perf-test', 'undo', null);
                }

                const sorted = [...frameDeltas].sort((a, b) => a - b);
                const dropped = frameDeltas.filter((d: number) => d > 16.67);
                const jank = frameDeltas.filter((d: number) => d > 50);
                const p95 = sorted[Math.floor(sorted.length * 0.95)];

                resolve({
                  totalFrames: frameDeltas.length,
                  droppedFrames: dropped.length,
                  jankFrames: jank.length,
                  p95Ms: Number(p95.toFixed(2)),
                  maxMs: Number(Math.max(...frameDeltas).toFixed(2)),
                  worst5: sorted
                    .slice(-5)
                    .reverse()
                    .map((d: number) => Number(d.toFixed(1))),
                  markerCascadesDuringEdits,
                  longFrames,
                });
              }

              function doEdit() {
                if (editIdx >= EDIT_COUNT) {
                  quiescenceTimer = setTimeout(finish, settle);
                  setTimeout(finish, maxWait);
                  return;
                }

                const ln = 20 + ((editIdx * 17) % Math.min(totalLines - 20, 200));
                const content = model.getLineContent(ln);
                editor.executeEdits('perf-test', [
                  {
                    range: {
                      startLineNumber: ln,
                      startColumn: content.length + 1,
                      endLineNumber: ln,
                      endColumn: content.length + 1,
                    },
                    text: ` {{ steps.http_step_${editIdx % 30}.output }}`,
                  },
                ]);
                editIdx++;
                setTimeout(doEdit, EDIT_INTERVAL_MS);
              }
              doEdit();
            });
          },
          { settle: settleMs, maxWait: maxWaitMs }
        );

        log.info(`Frame stats: ${JSON.stringify(frameStats, null, 2)}`);
        if (frameStats.longFrames.length > 0) {
          log.info(`Long frames (>= 1s): ${JSON.stringify(frameStats.longFrames, null, 2)}`);
        }

        // Liveness: the page kept rendering and validation ran during the edit burst.
        // These cannot flake on CPU share — they only fail if the editor froze or validation stopped.
        expect(frameStats.totalFrames, 'rAF should have fired at least once').toBeGreaterThan(0);
        expect(
          frameStats.markerCascadesDuringEdits,
          'setModelMarkers should have been called — validation must run during edits'
        ).toBeGreaterThan(0);

        // Catastrophe net only — a single pathological frame blocking the renderer for > N ms.
        // Cloud CI agents are slower than a developer Mac, so the ceiling is doubled on Cloud
        // to avoid false failures from CPU contention while still catching hangs and deadlocks.
        // The old 8692 ms failure was caused by the ES|QL validation backlog (now stubbed);
        // the remaining budget comfortably fits any Monaco YAML parsing for these fixtures.
        const maxFrameCeiling = config.isCloud ? 8000 : 4000;
        expect(
          frameStats.maxMs,
          `Worst frame time (${frameStats.maxMs}ms) should be under ${maxFrameCeiling}ms`
        ).toBeLessThan(maxFrameCeiling);

        // p95Ms is deliberately NOT asserted: frame deltas under two parallel Playwright workers
        // are dominated by the browser compositor scheduler, not by the code under test. A single
        // unrelated OS preemption moves the p95. This is what caused #261213 (509ms vs 500ms).
        // The value is logged above and tracked via log.info for trend visibility.
      });
    }
  }
);
