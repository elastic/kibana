/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { ZitherPublicPluginSetup, ZitherPublicPluginStart } from '@kbn/zither-plugin/public';
import type { Logger } from '@kbn/logging';

interface OnDeviceLLMExamplePluginSetupDeps {
  developerExamples: DeveloperExamplesSetup;
  zither: ZitherPublicPluginSetup;
}

interface OnDeviceLLMExamplePluginStartDeps {
  zither: ZitherPublicPluginStart;
}

export const ON_DEVICE_LLM_EXAMPLE_APP_ID = 'onDeviceLLMExample';

const onDeviceLLMExampleTitle = 'On Device LLM Example Plugin';

export class OnDeviceLLMExamplePlugin
  implements
    Plugin<void, void, OnDeviceLLMExamplePluginSetupDeps, OnDeviceLLMExamplePluginStartDeps>
{
  private readonly logger: Logger;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
  }

  public setup(
    core: CoreSetup<OnDeviceLLMExamplePluginStartDeps>,
    { developerExamples, zither }: OnDeviceLLMExamplePluginSetupDeps
  ) {
    // Setup logic

    core.application.register({
      id: ON_DEVICE_LLM_EXAMPLE_APP_ID,
      title: onDeviceLLMExampleTitle,
      mount: async (params) => {
        const [{ renderOnDeviceExampleApp }, [coreStart, deps]] = await Promise.all([
          import('./app'),
          core.getStartServices(),
        ]);

        return renderOnDeviceExampleApp(params.element, {
          coreStart,
          zither: deps.zither,
          logger: this.logger,
        });
      },
    });

    developerExamples.register({
      appId: ON_DEVICE_LLM_EXAMPLE_APP_ID,
      title: onDeviceLLMExampleTitle,
      description: 'An example plugin demonstrating on-device LLM capabilities.',
    });
  }

  public start(core: CoreStart, { zither }: OnDeviceLLMExamplePluginStartDeps) {
    // Start logic
  }
}
