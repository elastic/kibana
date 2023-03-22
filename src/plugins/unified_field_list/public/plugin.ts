/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ExtraFieldActionsRegistry } from './extra_field_actions_registry';
import { setExtraFieldActionsRegistry } from './kibana_services';
import { UnifiedFieldListPluginSetup, UnifiedFieldListPluginStart } from './types';

export class UnifiedFieldListPlugin
  implements Plugin<UnifiedFieldListPluginSetup, UnifiedFieldListPluginStart>
{
  private extraFieldActionsRegistry: ExtraFieldActionsRegistry | null = null;

  public setup(core: CoreSetup): UnifiedFieldListPluginSetup {
    this.extraFieldActionsRegistry = new ExtraFieldActionsRegistry();
    setExtraFieldActionsRegistry(this.extraFieldActionsRegistry);
    // Return methods that should be available to other plugins
    return {
      extraFieldOptions: {
        register: this.extraFieldActionsRegistry.addExtraFieldAction.bind(
          this.extraFieldActionsRegistry
        ),
      },
    };
  }

  public start(core: CoreStart): UnifiedFieldListPluginStart {
    return {};
  }

  public stop() {}
}
