/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

export const EMOTION_PERF_TEST = 'emotionPerfTest';
const emotionPerfTestTitle = 'Emotion Performance Test';

interface EmotionPerfPluginSetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export class EmotionPerfPlugin implements Plugin<void, void, EmotionPerfPluginSetupDependencies> {
  public setup(core: CoreSetup, { developerExamples }: EmotionPerfPluginSetupDependencies) {
    core.application.register({
      id: EMOTION_PERF_TEST,
      title: emotionPerfTestTitle,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [{ renderEmotionPerfApp }] = await Promise.all([import('./app')]);
        return renderEmotionPerfApp(params.element);
      },
    });
    developerExamples.register({
      appId: EMOTION_PERF_TEST,
      title: emotionPerfTestTitle,
      description: `A playground and learning tool that demonstrates the Dashboard layout engine.`,
    });
  }

  public start(core: CoreStart, deps: {}) {}

  public stop() {}
}
