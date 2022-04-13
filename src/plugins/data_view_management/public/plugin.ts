/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { PluginInitializerContext, CoreSetup, Plugin } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { UrlForwardingSetup } from '../../url_forwarding/public';

import { ManagementSetup } from '../../management/public';
import { IndexPatternFieldEditorStart } from '../../data_view_field_editor/public';
import { DataViewEditorStart } from '../../data_view_editor/public';
import { DataViewsPublicPluginStart } from '../../data_views/public';
import { SpacesPluginStart } from '../../../../x-pack/plugins/spaces/public';
import { UnifiedSearchPublicPluginStart } from '../../unified_search/public';

export interface IndexPatternManagementSetupDependencies {
  management: ManagementSetup;
  urlForwarding: UrlForwardingSetup;
}

export interface IndexPatternManagementStartDependencies {
  data: DataPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViewEditor: DataViewEditorStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  spaces?: SpacesPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IndexPatternManagementSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IndexPatternManagementStart {}

const sectionsHeader = i18n.translate('indexPatternManagement.dataView.sectionsHeader', {
  defaultMessage: 'Data Views',
});

const IPM_APP_ID = 'dataViews';

export class IndexPatternManagementPlugin
  implements
    Plugin<
      IndexPatternManagementSetup,
      IndexPatternManagementStart,
      IndexPatternManagementSetupDependencies,
      IndexPatternManagementStartDependencies
    >
{
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<IndexPatternManagementStartDependencies, IndexPatternManagementStart>,
    { management, urlForwarding }: IndexPatternManagementSetupDependencies
  ) {
    const kibanaSection = management.sections.section.kibana;

    if (!kibanaSection) {
      throw new Error('`kibana` management section not found.');
    }

    const newAppPath = `management/kibana/${IPM_APP_ID}`;
    const legacyPatternsPath = 'management/kibana/index_patterns';

    urlForwarding.forwardApp('management/kibana/index_pattern', newAppPath, (path) => '/create');
    urlForwarding.forwardApp(legacyPatternsPath, newAppPath, (path) => {
      const pathInApp = path.substr(legacyPatternsPath.length + 1);
      return pathInApp && `/patterns${pathInApp}`;
    });

    kibanaSection.registerApp({
      id: IPM_APP_ID,
      title: sectionsHeader,
      order: 0,
      capabilitiesId: 'indexPatterns',
      redirectFrom: 'kibana/indexPatterns',
      mount: async (params) => {
        const { mountManagementSection } = await import('./management_app');

        return mountManagementSection(core.getStartServices, params);
      },
    });
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
