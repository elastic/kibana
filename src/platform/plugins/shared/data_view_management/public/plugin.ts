/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  IUiSettingsClient,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { i18n } from '@kbn/i18n';
import type { NoDataPagePluginSetup } from '@kbn/no-data-page-plugin/public';
import type { UrlForwardingSetup } from '@kbn/url-forwarding-plugin/public';

import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

export interface IndexPatternManagementSetupDependencies {
  management: ManagementSetup;
  urlForwarding: UrlForwardingSetup;
  noDataPage?: NoDataPagePluginSetup;
}

export interface IndexPatternManagementStartDependencies {
  data: DataPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViewEditor: DataViewEditorStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  share?: SharePluginStart;
  spaces?: SpacesPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  uiSettings: IUiSettingsClient;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IndexPatternManagementSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IndexPatternManagementStart {}

const sectionsHeader = i18n.translate('indexPatternManagement.dataView.sectionsHeader', {
  defaultMessage: 'Data Views',
});

export const IPM_APP_ID = 'dataViews';

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
    { management, urlForwarding, ...deps }: IndexPatternManagementSetupDependencies
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

        return mountManagementSection(core.getStartServices, deps, params);
      },
    });
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
