/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PluginInitializerContext, CoreStart, Plugin } from '@kbn/core/public';
import { setTheme } from './services';
import type { RandomSamplingPublicPluginStart } from './types';

import { createControlSlider } from './ui/slider_control';
import { createIcon } from './ui/icon/sampling_icon';

export class RandomSamplingPublicPlugin implements Plugin<{}, RandomSamplingPublicPluginStart> {
  constructor(initializerContext: PluginInitializerContext<{}>) {}

  public setup() {
    return {};
  }

  public start(core: CoreStart): RandomSamplingPublicPluginStart {
    setTheme(core.theme);

    return {
      ui: {
        ControlSlider: createControlSlider(),
        SamplingIcon: createIcon(),
      },
    };
  }

  public stop() {}
}
