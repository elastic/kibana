/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReplaySubject, firstValueFrom } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { HOUSEKEEPING_APP_ID } from '../common';
import type { HousekeepingPublicStart, HousekeepingService } from './housekeeping_service';
import { createHousekeepingService } from './housekeeping_service';
import type { HousekeepingFindingActionDefinition } from './metadata';
import { HOUSEKEEPING_TITLE } from './texts';

export interface HousekeepingPublicSetup {
  /** Registers the UI that resolves the findings whose `action` has this id. */
  registerFindingAction(definition: HousekeepingFindingActionDefinition): void;
}

interface SetupDependencies {
  management: ManagementSetup;
}

interface StartDependencies {
  share?: SharePluginStart;
  console?: ConsolePluginStart;
  agentBuilder?: AgentBuilderPluginStart;
}

export class HousekeepingPublicPlugin
  implements
    Plugin<HousekeepingPublicSetup, HousekeepingPublicStart, SetupDependencies, StartDependencies>
{
  private readonly findingActions = new Map<string, HousekeepingFindingActionDefinition>();

  // Created in `start` and shared by the page and the flyout, so they share one cache.
  private readonly service$ = new ReplaySubject<HousekeepingService>(1);

  public setup(core: CoreSetup, { management }: SetupDependencies): HousekeepingPublicSetup {
    management.sections.section.stack.registerApp({
      id: HOUSEKEEPING_APP_ID,
      title: HOUSEKEEPING_TITLE,
      order: 2,
      keywords: ['cleanup', 'orphan', 'unused', 'broken references'],
      mount: async (params) => {
        const [[coreStart], service, { renderApp }] = await Promise.all([
          core.getStartServices(),
          firstValueFrom(this.service$),
          import('./application'),
        ]);
        return renderApp(params, { coreStart, service, title: HOUSEKEEPING_TITLE });
      },
    });

    return {
      registerFindingAction: (definition) => {
        if (this.findingActions.has(definition.id)) {
          throw new Error(`Housekeeping finding action [${definition.id}] is already registered`);
        }
        this.findingActions.set(definition.id, definition);
      },
    };
  }

  public start(
    core: CoreStart,
    { share, console: consolePlugin, agentBuilder }: StartDependencies
  ): HousekeepingPublicStart {
    const service = createHousekeepingService(
      core,
      share,
      consolePlugin,
      agentBuilder,
      this.findingActions
    );
    this.service$.next(service);
    return service.start;
  }

  public stop() {}
}
