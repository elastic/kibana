/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-shadow, playwright/no-wait-for-timeout */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../fixtures';
import { getCrazyTriageWorkflowYaml, getLargePerfWorkflowYaml } from '../fixtures/workflows';

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

const WORKFLOW_CASES = [
  { name: 'large_perf (87 steps, 431 vars)', getYaml: getLargePerfWorkflowYaml },
  { name: 'crazy_triage (150 steps, 361 vars)', getYaml: getCrazyTriageWorkflowYaml },
] as const;

test.describe(
  'Workflow editor: validation performance',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.workflowEditor.gotoNewWorkflow();
    });

    for (const { name, getYaml } of WORKFLOW_CASES) {
      test(`[${name}] setModelMarkers cascade completes within frame budget after edit`, async ({
        pageObjects,
        page,
        log,
      }) => {
        const yaml = getYaml();
        await pageObjects.workflowEditor.setYamlEditorValue(yaml);

        await page.waitForTimeout(5000);

        const result: EditCycleResult = await page.evaluate(() => {
          return new Promise<EditCycleResult>((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const monacoEnv = (window as any).MonacoEnvironment;
            const editorEl = document.querySelector('.monaco-editor[data-uri]');
            if (!editorEl || !monacoEnv?.monaco?.editor) {
              throw new Error('Monaco editor not available');
            }
            const uri = editorEl.getAttribute('data-uri')!;
            const model = monacoEnv.monaco.editor.getModel(uri);
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

            monacoEnv.monaco.editor.setModelMarkers = (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              m: any,
              source: string,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              markers: any[]
            ) => {
              const callStart = performance.now();
              const result = origSetModelMarkers(m, source, markers);
              const callEnd = performance.now();
              if (editTimestamp > 0) {
                markerCalls.push({
                  source,
                  markerCount: markers.length,
                  offsetMs: Number((callStart - editTimestamp).toFixed(2)),
                  durationMs: Number((callEnd - callStart).toFixed(2)),
                });
              }
              return result;
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
            const editSyncMs = Number((performance.now() - editTimestamp).toFixed(2));

            setTimeout(() => {
              monacoEnv.monaco.editor.setModelMarkers = origSetModelMarkers;
              editor.trigger('perf-test', 'undo', null);

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
                editSyncMs,
                markerCalls,
                totalMarkerCascadeMs: Number((lastCall - firstCall).toFixed(2)),
                totalMarkerWorkMs: Number(totalWork.toFixed(2)),
                markerCallCount: markerCalls.length,
              });
            }, 5000);
          });
        });

        log.info(`Edit sync time: ${result.editSyncMs}ms`);
        log.info(`Marker calls: ${result.markerCallCount}`);
        log.info(`Total marker cascade span: ${result.totalMarkerCascadeMs}ms`);
        log.info(`Total marker work (sum of durations): ${result.totalMarkerWorkMs}ms`);
        log.info(`Marker call details: ${JSON.stringify(result.markerCalls, null, 2)}`);

        expect(result.editSyncMs, 'Synchronous edit time should be under 100ms').toBeLessThan(100);

        expect(
          result.totalMarkerWorkMs,
          `Total setModelMarkers work (${result.totalMarkerWorkMs}ms) should ` +
            `be under 200ms — sum of actual marker application durations`
        ).toBeLessThan(200);

        for (const call of result.markerCalls) {
          expect(
            call.durationMs,
            `setModelMarkers("${call.source}") took ${call.durationMs}ms, should be under 100ms`
          ).toBeLessThan(100);
        }
      });

      test(`[${name}] frame rate stays above threshold during rapid edits`, async ({
        pageObjects,
        page,
        log,
      }) => {
        const yaml = getYaml();
        await pageObjects.workflowEditor.setYamlEditorValue(yaml);

        await page.waitForTimeout(5000);

        const frameStats = await page.evaluate(() => {
          const EDIT_COUNT = 40;
          const EDIT_INTERVAL_MS = 30;
          const SETTLE_MS = 4000;

          return new Promise<{
            totalFrames: number;
            droppedFrames: number;
            jankFrames: number;
            p95Ms: number;
            maxMs: number;
            worst5: number[];
            markerCascadesDuringEdits: number;
          }>((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const monacoEnv = (window as any).MonacoEnvironment;
            const editorEl = document.querySelector('.monaco-editor[data-uri]');
            if (!editorEl || !monacoEnv?.monaco?.editor) {
              throw new Error('Monaco editor not available');
            }
            const uri = editorEl.getAttribute('data-uri')!;
            const model = monacoEnv.monaco.editor.getModel(uri);
            const editors = monacoEnv.monaco.editor.getEditors();

            const editor = editors.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (e: any) => e.getModel()?.uri?.toString() === model.uri.toString()
            );

            if (!model || !editor) {
              throw new Error('Editor model or instance not found');
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

            function doEdit() {
              if (editIdx >= EDIT_COUNT) {
                setTimeout(() => {
                  rafRunning = false;
                  monacoEnv.monaco.editor.setModelMarkers = origSetModelMarkers;

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
                  });
                }, SETTLE_MS);
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
        });

        log.info(`Frame stats: ${JSON.stringify(frameStats, null, 2)}`);

        expect(
          frameStats.maxMs,
          `Worst frame time (${frameStats.maxMs}ms) should be under 4000ms`
        ).toBeLessThan(4000);

        expect(
          frameStats.p95Ms,
          `p95 frame time (${frameStats.p95Ms}ms) should be under 100ms`
        ).toBeLessThan(100);
      });
    }
  }
);
