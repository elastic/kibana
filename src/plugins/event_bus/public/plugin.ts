/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EventBusPluginSetup, EventBusPluginStart } from './types';
import { PLUGIN_NAME } from '../common';

export class EventBusPlugin implements Plugin<EventBusPluginSetup, EventBusPluginStart> {
  public setup(core: CoreSetup): EventBusPluginSetup {
    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('eventBus.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): EventBusPluginStart {
    return {};
  }

  public stop() {}
}
