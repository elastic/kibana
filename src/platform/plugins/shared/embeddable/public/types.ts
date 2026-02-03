/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { registerAddFromLibraryType } from './add_from_library/registry';
import type { registerReactEmbeddableFactory } from './react_embeddable_system';
import type { EmbeddableStateTransfer } from './state_transfer';
import type {
  EmbeddableTransforms,
  TransformEnhancementsIn,
  TransformEnhancementsOut,
} from '../common';
import type { AddFromLibraryFormProps } from './add_from_library/add_from_library_flyout';

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
   * Register a saved object type with the "Add from library" flyout.
   *
   * `onAdd` receives the container and the saved object. You may pass a second boolean parameter
   *  to `addNewPanel` to enable a success message and automatic scrolling.
   *
   * @example
   *  registerAddFromLibraryType({
   *    onAdd: (container, savedObject) => {
   *     container.addNewPanel(
   *         {
   *           panelType: MY_EMBEDDABLE_TYPE,
   *           serializedState: {
   *             rawState: savedObject.attributes,
   *           },
   *         },
   *         true // shows a toast and scrolls to panel
   *       );
   *    },
   *    savedObjectType: MAP_SAVED_OBJECT_TYPE,
   *    savedObjectName: i18n.translate('xpack.maps.mapSavedObjectLabel', {
   *      defaultMessage: 'Map',
   *    }),
   *    getIconForSavedObject: () => APP_ICON,
   *  });
   */
  registerAddFromLibraryType: typeof registerAddFromLibraryType;

  /**
   * Registers an async {@link ReactEmbeddableFactory} getter.
   */
  registerReactEmbeddableFactory: typeof registerReactEmbeddableFactory;

  /**
   * Register legacyURLTransform for an embeddable type.
   * LegacyURLTransform is used to convert StoredEmbeddableState from URL into EmbeddableState.
   */
  registerLegacyURLTransform: (
    type: string,
    getTransformOut: () => Promise<EmbeddableTransforms['transformOut']>
  ) => void;

  transformEnhancementsIn: TransformEnhancementsIn;
  transformEnhancementsOut: TransformEnhancementsOut;
}

export interface EmbeddableStart {
  getAddFromLibraryComponent: () => Promise<React.FC<AddFromLibraryFormProps>>;
  getStateTransfer: (storage?: Storage) => EmbeddableStateTransfer;
  getLegacyURLTransform: (
    type: string
  ) => Promise<EmbeddableTransforms['transformOut'] | undefined>;
  hasLegacyURLTransform: (type: string) => boolean;
}
