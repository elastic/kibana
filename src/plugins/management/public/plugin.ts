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
import { ManagementSetup, ManagementStart } from './types';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '../../home/public';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
} from '../../../core/public';

import { ManagementSectionsService } from './management_sections_service';

interface ManagementSetupDependencies {
  home: HomePublicPluginSetup;
}

export class ManagementPlugin implements Plugin<ManagementSetup, ManagementStart> {
  private readonly managementSections = new ManagementSectionsService();

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { home }: ManagementSetupDependencies) {
    const kibanaVersion = this.initializerContext.env.packageInfo.version;

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
    });

    core.application.register({
      id: 'management',
      title: i18n.translate('management.stackManagement.title', {
        defaultMessage: 'Stack Management',
      }),
      order: 9003,
      euiIconType: 'managementApp',
      category: DEFAULT_APP_CATEGORIES.management,
      async mount(context, params) {
        const { renderApp } = await import('./application');
        const selfStart = (await core.getStartServices())[2] as ManagementStart;

        return renderApp(context, params, {
          kibanaVersion,
          management: selfStart,
        });
      },
    });

    return {
      sections: this.managementSections.setup(),
    };
  }

  public start(core: CoreStart) {
    return {
      sections: this.managementSections.start({ capabilities: core.application.capabilities }),
    };
  }
}
