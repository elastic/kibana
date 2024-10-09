/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subscription } from 'rxjs';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  PublicAppInfo,
} from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import { bootstrap } from './bootstrap';
import {
  registerReactEmbeddableSavedObject,
  ReactEmbeddableSavedObject,
  getReactEmbeddableSavedObjects,
} from './lib';
import { EmbeddableStateTransfer } from './lib/state_transfer';
import { setKibanaServices } from './kibana_services';
import {
  reactEmbeddableRegistryHasKey,
  registerReactEmbeddableFactory,
} from './react_embeddable_system';
import { registerSavedObjectToPanelMethod } from './registry/saved_object_to_panel_methods';

export interface EmbeddableSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface EmbeddableStartDependencies {
  uiActions: UiActionsStart;
  inspector: InspectorStart;
  usageCollection: UsageCollectionStart;
  contentManagement: ContentManagementPublicStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}

export interface EmbeddableSetup {
  /**
   * Register an embeddable API saved object with the Add from library flyout.
   *
   * @example
   *  registerReactEmbeddableSavedObject({
   *    onAdd: (container, savedObject) => {
   *      container.addNewPanel({
   *        panelType: CONTENT_ID,
   *        initialState: savedObject.attributes,
   *      });
   *    },
   *    embeddableType: CONTENT_ID,
   *    savedObjectType: MAP_SAVED_OBJECT_TYPE,
   *    savedObjectName: i18n.translate('xpack.maps.mapSavedObjectLabel', {
   *      defaultMessage: 'Map',
   *    }),
   *    getIconForSavedObject: () => APP_ICON,
   *  });
   */
  registerReactEmbeddableSavedObject: typeof registerReactEmbeddableSavedObject;

  /**
   * @deprecated React embeddables should register their saved objects with {@link registerReactEmbeddableSavedObject}.
   */
  registerSavedObjectToPanelMethod: typeof registerSavedObjectToPanelMethod;

  /**
   * Registers an async {@link ReactEmbeddableFactory} getter.
   */
  registerReactEmbeddableFactory: typeof registerReactEmbeddableFactory;
}

export interface EmbeddableStart {
  /**
   * Checks if a {@link ReactEmbeddableFactory} has been registered using {@link registerReactEmbeddableFactory}
   */
  reactEmbeddableRegistryHasKey: (type: string) => boolean;

  /**
   *
   * @returns An iterator over all {@link ReactEmbeddableSavedObject}s that have been registered using {@link registerReactEmbeddableSavedObject}.
   */
  getReactEmbeddableSavedObjects: <
    TSavedObjectAttributes extends FinderAttributes
  >() => IterableIterator<[string, ReactEmbeddableSavedObject<TSavedObjectAttributes>]>;

  getStateTransfer: (storage?: Storage) => EmbeddableStateTransfer;
}
export class EmbeddablePublicPlugin implements Plugin<EmbeddableSetup, EmbeddableStart> {
  private stateTransferService: EmbeddableStateTransfer = {} as EmbeddableStateTransfer;
  private appList?: ReadonlyMap<string, PublicAppInfo>;
  private appListSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { uiActions }: EmbeddableSetupDependencies) {
    bootstrap(uiActions);

    return {
      registerReactEmbeddableFactory,
      registerSavedObjectToPanelMethod,
      registerReactEmbeddableSavedObject,
    };
  }

  public start(core: CoreStart, deps: EmbeddableStartDependencies): EmbeddableStart {
    this.appListSubscription = core.application.applications$.subscribe((appList) => {
      this.appList = appList;
    });

    this.stateTransferService = new EmbeddableStateTransfer(
      core.application.navigateToApp,
      core.application.currentAppId$,
      this.appList
    );

    const embeddableStart: EmbeddableStart = {
      reactEmbeddableRegistryHasKey,
      getReactEmbeddableSavedObjects,
      getStateTransfer: (storage?: Storage) =>
        storage
          ? new EmbeddableStateTransfer(
              core.application.navigateToApp,
              core.application.currentAppId$,
              this.appList,
              storage
            )
          : this.stateTransferService,
    };

    setKibanaServices(core, embeddableStart, deps);
    return embeddableStart;
  }

  public stop() {
    if (this.appListSubscription) {
      this.appListSubscription.unsubscribe();
    }
  }
}
