/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { ManagementSetup, ManagementStart } from './types';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '../../home/public';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
  AppMountParameters,
  AppUpdater,
  AppStatus,
  AppNavLinkStatus,
  AppSearchDeepLink,
} from '../../../core/public';

import { MANAGEMENT_APP_ID } from '../common/contants';
import {
  ManagementSectionsService,
  getSectionsServiceStartPrivate,
} from './management_sections_service';
import { ManagementSection } from './utils';

interface ManagementSetupDependencies {
  home?: HomePublicPluginSetup;
}

export class ManagementPlugin implements Plugin<ManagementSetup, ManagementStart> {
  private readonly managementSections = new ManagementSectionsService();

  private readonly appUpdater = new BehaviorSubject<AppUpdater>(() => {
    const deepLinks: AppSearchDeepLink[] = Object.values(
      this.managementSections.definedSections
    ).map((section: ManagementSection) => ({
      id: section.id,
      title: section.title,
      searchDeepLinks: section.getAppsEnabled().map((mgmtApp) => ({
        id: mgmtApp.id,
        title: mgmtApp.title,
        path: mgmtApp.basePath,
      })),
    }));

    return {
      searchDeepLinks: deepLinks,
    };
  });

  private hasAnyEnabledApps = true;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { home }: ManagementSetupDependencies) {
    const kibanaVersion = this.initializerContext.env.packageInfo.version;

    if (home) {
      home.featureCatalogue.register({
        id: 'stack-management',
        title: i18n.translate('management.stackManagement.managementLabel', {
          defaultMessage: 'Stack Management',
        }),
        description: i18n.translate('management.stackManagement.managementDescription', {
          defaultMessage: 'Your center console for managing the Elastic Stack.',
        }),
        icon: 'managementApp',
        path: '/app/management',
        showOnHomePage: false,
        category: FeatureCatalogueCategory.ADMIN,
        visible: () => this.hasAnyEnabledApps,
      });
    }

    core.application.register({
      id: MANAGEMENT_APP_ID,
      title: i18n.translate('management.stackManagement.title', {
        defaultMessage: 'Stack Management',
      }),
      order: 9040,
      euiIconType: 'logoElastic',
      category: DEFAULT_APP_CATEGORIES.management,
      updater$: this.appUpdater,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();

        return renderApp(params, {
          sections: getSectionsServiceStartPrivate(),
          kibanaVersion,
          setBreadcrumbs: coreStart.chrome.setBreadcrumbs,
        });
      },
    });

    return {
      sections: this.managementSections.setup(),
    };
  }

  public start(core: CoreStart) {
    this.managementSections.start({ capabilities: core.application.capabilities });
    this.hasAnyEnabledApps = getSectionsServiceStartPrivate()
      .getSectionsEnabled()
      .some((section) => section.getAppsEnabled().length > 0);

    if (!this.hasAnyEnabledApps) {
      this.appUpdater.next(() => {
        return {
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.hidden,
        };
      });
    }

    return {};
  }
}
