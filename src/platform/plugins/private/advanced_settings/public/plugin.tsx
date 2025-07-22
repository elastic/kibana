/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin } from '@kbn/core/public';
import { SectionRegistry } from '@kbn/management-settings-section-registry';
import ReactDOM from 'react-dom';
import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import {
  AdvancedSettingsSetup,
  AdvancedSettingsStart,
  AdvancedSettingsPluginSetup,
  AdvancedSettingsPluginStart,
} from './types';

const { setup: sectionRegistrySetup, start: sectionRegistryStart } = new SectionRegistry();

const LazyKibanaSettingsApplication = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-application')).KibanaSettingsApplication,
}));

const KibanaSettingsApplication = withSuspense(LazyKibanaSettingsApplication);

const title = i18n.translate('advancedSettings.advancedSettingsLabel', {
  defaultMessage: 'Advanced Settings',
});

export class AdvancedSettingsPlugin
  implements
    Plugin<
      AdvancedSettingsSetup,
      AdvancedSettingsStart,
      AdvancedSettingsPluginSetup,
      AdvancedSettingsPluginStart
    >
{
  public setup(
    core: CoreSetup<AdvancedSettingsPluginStart>,
    { management, home }: AdvancedSettingsPluginSetup
  ) {
    const kibanaSection = management.sections.section.kibana;

    kibanaSection.registerApp({
      id: 'settings',
      title,
      order: 3,
      async mount({ element, setBreadcrumbs, history }) {
        const [coreStart, { spaces }] = await core.getStartServices();

        const { docTitle } = coreStart.chrome;
        docTitle.change(title);
        setBreadcrumbs([{ text: title }]);

        ReactDOM.render(
          coreStart.rendering.addContext(
            <KibanaSettingsApplication
              {...{
                ...coreStart,
                history,
                spaces,
                sectionRegistry: sectionRegistryStart,
              }}
            />
          ),
          element
        );
        return () => {
          docTitle.reset();
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    if (home) {
      home.featureCatalogue.register({
        id: 'advanced_settings',
        title,
        description: i18n.translate('advancedSettings.featureCatalogueTitle', {
          defaultMessage:
            'Customize your Kibana experience — change the date format, turn on dark mode, and more.',
        }),
        icon: 'gear',
        path: '/app/management/kibana/settings',
        showOnHomePage: false,
        category: 'admin',
      });
    }

    return {
      ...sectionRegistrySetup,
    };
  }

  public start() {
    return {
      ...sectionRegistryStart,
    };
  }
}
