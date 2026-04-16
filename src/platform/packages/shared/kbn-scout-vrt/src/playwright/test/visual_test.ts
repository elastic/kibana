/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { test as scoutTest } from '@kbn/scout';
import { getKibanaModuleData } from '@kbn/scout-reporting';
import type { Locator, TestStepInfo } from 'playwright/test';
import {
  getVisualRegressionRunId,
  SCOUT_VISUAL_REGRESSION_ATTACHMENT_NAME,
} from '../runtime/environment';
import { toRepoRelativePath } from '../runtime/paths';
import { createVisualTestKey } from '../runtime/test_key';
import { captureVisualCheckpoint } from '../runtime/checkpoint_capture';
import type { VisualRegressionContext, VisualSourceLocation } from '../runtime/types';
import { runVisualStep } from './run_visual_step';

type BaseStepOptions = NonNullable<Parameters<typeof scoutTest.step>[2]>;

export interface VisualTestStepOptions extends BaseStepOptions {
  snapshot?: boolean;
  mask?: Locator[];
}

let currentContext: VisualRegressionContext | undefined;

const resolveVisualSourceLocation = (
  stack: string | undefined,
  fallbackFile: string,
  fallbackLine: number,
  fallbackColumn: number
): VisualSourceLocation => {
  const stackLines = stack?.split('\n') ?? [];

  for (const stackLine of stackLines) {
    const match =
      stackLine.match(/\((.*\.ts):(\d+):(\d+)\)/) ?? stackLine.match(/at (.*\.ts):(\d+):(\d+)/);

    if (!match) {
      continue;
    }

    const [, file, line, column] = match;

    if (file.includes('/src/platform/packages/shared/kbn-scout-vrt/')) {
      continue;
    }

    return {
      file: toRepoRelativePath(file),
      line: Number(line),
      column: Number(column),
    };
  }

  return {
    file: toRepoRelativePath(fallbackFile),
    line: fallbackLine,
    column: fallbackColumn,
  };
};

const getVisualRegressionContext = (): VisualRegressionContext => {
  const context = currentContext;

  if (!context) {
    throw new Error('visualTest.step() must be called while a visualTest is running');
  }

  return context;
};

const visualTestBase = scoutTest.extend<{ _visualRegressionContext: void }>({
  _visualRegressionContext: [
    async ({ page }, use, testInfo) => {
      const absoluteTestFilePath = path.resolve(testInfo.file);
      const packageId = getKibanaModuleData(absoluteTestFilePath).id;
      const context: VisualRegressionContext = {
        page,
        testInfo,
        stepCounter: 0,
        checkpoints: [],
        runId: getVisualRegressionRunId(),
        packageId,
        testKey: createVisualTestKey(testInfo.file, testInfo.title, {
          projectName: testInfo.project.name,
          location: process.env.SCOUT_TARGET_LOCATION || 'unknown',
          arch: process.env.SCOUT_TARGET_ARCH || 'unknown',
          domain: process.env.SCOUT_TARGET_DOMAIN || 'unknown',
        }),
      };

      const previousContext = currentContext;
      currentContext = context;

      try {
        await use();
      } finally {
        currentContext = previousContext;
      }

      if (context.checkpoints.length > 0) {
        await testInfo.attach(SCOUT_VISUAL_REGRESSION_ATTACHMENT_NAME, {
          body: Buffer.from(JSON.stringify(context.checkpoints), 'utf8'),
          contentType: 'application/json',
        });
      }
    },
    { auto: true },
  ],
});

const splitStepOptions = (options: VisualTestStepOptions = {}) => {
  const { snapshot = true, mask = [], ...stepOptions } = options;
  return { snapshot, mask, stepOptions };
};

const createVisualTest = <T extends typeof visualTestBase>(baseTest: T) => {
  const originalStep = baseTest.step.bind(baseTest);
  const originalStepSkip = baseTest.step.skip.bind(baseTest.step);
  const step = async <TValue>(
    title: string,
    body: (stepInfo: TestStepInfo) => TValue | Promise<TValue>,
    options?: VisualTestStepOptions
  ): Promise<TValue> => {
    const context = getVisualRegressionContext();
    const { snapshot, mask, stepOptions } = splitStepOptions(options);
    const stepIndex = ++context.stepCounter;
    const source = resolveVisualSourceLocation(
      new Error().stack,
      context.testInfo.file,
      context.testInfo.line,
      context.testInfo.column
    );

    return originalStep(
      title,
      async (stepInfo) =>
        runVisualStep({
          snapshot,
          body: () => body(stepInfo),
          capture: async () => {
            const result = await captureVisualCheckpoint(context, {
              stepTitle: title,
              stepIndex,
              mask,
              source,
            });

            context.checkpoints.push(result.record);

            if (result.error) {
              throw result.error;
            }
          },
        }),
      stepOptions
    );
  };

  step.skip = (
    title: string,
    body: (stepInfo: TestStepInfo) => any | Promise<any>,
    options?: VisualTestStepOptions
  ) => {
    const { stepOptions } = splitStepOptions(options);
    return originalStepSkip(title, body, stepOptions);
  };

  const originalExtend = baseTest.extend.bind(baseTest);
  type ExtendArgs = Parameters<typeof originalExtend>;
  const extend = ((...args: ExtendArgs) => {
    return createVisualTest(originalExtend(...args));
  }) as T['extend'];
  const wrappedVisualTest = baseTest as T & {
    step: typeof step & {
      skip: typeof step.skip;
    };
  };
  wrappedVisualTest.extend = extend;
  wrappedVisualTest.step = step;

  return wrappedVisualTest;
};

export const visualTest = createVisualTest(visualTestBase);
