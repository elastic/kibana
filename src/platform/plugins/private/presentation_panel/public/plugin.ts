/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { setKibanaServices } from './kibana_services';
import { registerActions } from './panel_actions/panel_actions';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationPanelSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationPanelStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationPanelSetupDependencies {}

export interface PresentationPanelStartDependencies {
  uiActions: UiActionsStart;
  inspector: InspectorStart;
  usageCollection: UsageCollectionStart;
  contentManagement: ContentManagementPublicStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}

export class PresentationPanelPlugin
  implements
    Plugin<
      PresentationPanelSetup,
      PresentationPanelStart,
      PresentationPanelSetupDependencies,
      PresentationPanelStartDependencies
    >
{
  public setup(
    _coreSetup: CoreSetup<PresentationPanelSetupDependencies, PresentationPanelStart>,
    _setupPlugins: PresentationPanelSetupDependencies
  ): PresentationPanelSetup {
    return {};
  }

  public start(
    coreStart: CoreStart,
    startPlugins: PresentationPanelStartDependencies
  ): PresentationPanelStart {
    setKibanaServices(coreStart, startPlugins);
    registerActions();
    return {};
  }

  public stop() {}
}
