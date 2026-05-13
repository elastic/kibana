/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject, map } from 'rxjs';
import type {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { Subscription } from 'rxjs';
import { AppStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { LAB_IDS, PLUGIN_ICON, PLUGIN_ID, PLUGIN_PATH, type LabId } from '../common';
import { getLabDefinitions } from './lab_apps';
import {
  createInstalledLabsService,
  type InstalledLabsService,
} from './services/installed_labs_service';

export class LabsPlugin implements Plugin {
  private readonly installedLabIds$ = new BehaviorSubject<readonly LabId[]>([]);
  private readonly labDefinitions = getLabDefinitions();
  private installedLabsService?: InstalledLabsService;
  private installedLabsSubscription?: Subscription;

  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const plugin = this;

    core.application.register({
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: PLUGIN_ID,
      title: i18n.translate('labs.navTitle', {
        defaultMessage: 'Labs',
      }),
      euiIconType: PLUGIN_ICON,
      order: 9000,
      appRoute: PLUGIN_PATH,
      visibleIn: ['globalSearch', 'home', 'sideNav'],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        const installedLabsService = plugin.ensureInstalledLabsService(coreStart);
        return renderApp({
          coreStart,
          installedLabsService,
          labs: plugin.labDefinitions,
          params,
        });
      },
    });

    for (const labDefinition of plugin.labDefinitions) {
      core.application.register({
        category: DEFAULT_APP_CATEGORIES.kibana,
        id: labDefinition.appId,
        title: labDefinition.title,
        euiIconType: labDefinition.euiIconType,
        order: 9100 + labDefinition.order,
        updater$: this.installedLabIds$.pipe(
          map(
            (installedLabIds): AppUpdater =>
              () => ({
                status: installedLabIds.includes(labDefinition.id)
                  ? AppStatus.accessible
                  : AppStatus.inaccessible,
              })
          )
        ),
        visibleIn: ['globalSearch', 'sideNav'],
        async mount(params: AppMountParameters) {
          const [coreStart] = await core.getStartServices();
          const installedLabsService = plugin.ensureInstalledLabsService(coreStart);
          return labDefinition.mount({
            coreStart,
            params,
            installedLabsService,
          });
        },
      });
    }

    return {};
  }

  public start(core: CoreStart) {
    const installedLabsService = this.ensureInstalledLabsService(core);

    this.installedLabsSubscription = installedLabsService
      .getInstalledLabIds$()
      .subscribe((installedLabIds) => {
        this.installedLabIds$.next(installedLabIds);
      });

    void installedLabsService.load();

    return {};
  }

  public stop() {
    this.installedLabsSubscription?.unsubscribe();
    this.installedLabIds$.complete();
  }

  private ensureInstalledLabsService(coreStart: CoreStart) {
    if (!this.installedLabsService) {
      this.installedLabsService = createInstalledLabsService({
        allowedLabIds: LAB_IDS,
        userProfile: coreStart.userProfile,
      });
    }

    return this.installedLabsService;
  }
}
