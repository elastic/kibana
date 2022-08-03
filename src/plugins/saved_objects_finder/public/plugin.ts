/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, IUiSettingsClient, Plugin } from '@kbn/core/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { SavedObjectsStart } from '@kbn/saved-objects-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { getSavedObjectFinder, SavedObjectFinderProps } from './finder';

export interface SavedObjectsFinderStart {
  SavedObjectFinder: (props: SavedObjectFinderProps) => JSX.Element;
}

interface SavedObjectsFinderStartDeps {
  uiSettings: IUiSettingsClient;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsPlugin: SavedObjectsStart;
  savedObjectsTagging: SavedObjectsTaggingApi | undefined;
}

export class SavedObjectsFinderPublicPlugin
  implements Plugin<{}, SavedObjectsFinderStart, object, SavedObjectsFinderStartDeps>
{
  public setup() {
    return {};
  }

  public start(core: CoreStart, deps: SavedObjectsFinderStartDeps) {
    return {
      SavedObjectFinder: getSavedObjectFinder(
        core.savedObjects,
        deps.uiSettings,
        deps.savedObjectsManagement,
        deps.savedObjectsPlugin,
        deps.savedObjectsTagging
      ),
    };
  }
}
