/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  HasEditCapabilities,
  HasLibraryTransforms,
  HasSupportedTriggers,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesDisabledActionIds,
  PublishesProjectRoutingOverrides,
  PublishesRendered,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishesWritableDescription,
  PublishesWritableTitle,
  PublishesUnsavedChanges,
} from '@kbn/presentation-publishing';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils';
import type { Simplify } from '@kbn/chart-expressions-common';
import type {
  LensByValueBase,
  LensSerializedSharedState,
  LensByRefSerializedState,
  LensInspectorAdapters,
  LensRequestHandlersProps,
  LensApiCallbacks,
  LensHasEditPanel,
  LensSerializedState,
} from '@kbn/lens-common';
import type { PublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';

type LensByValueAPIConfigBase = Omit<LensByValueBase, 'attributes'> & {
  // Temporarily allow both old and new attributes until all are new types are supported and feature flag removed
  attributes: LensApiSchemaType | LensByValueBase['attributes'];
};

export type LensByValueSerializedAPIConfig = Simplify<
  LensSerializedSharedState & LensByValueAPIConfigBase
>;
export type LensByRefSerializedAPIConfig = LensByRefSerializedState;

/**
 * Combined properties of API config used in dashboard API for lens panels
 *
 *  Includes:
 * - Lens document state (for by-value)
 * - Panel settings
 * - other props from the embeddable
 */
export type LensSerializedAPIConfig = LensByRefSerializedAPIConfig | LensByValueSerializedAPIConfig;

export interface LegacyLensStateApi {
  /**
   * Returns legacy serialized state to avoid duplicate transformations
   *
   * @deprecated use `serializeState` instead
   */
  getLegacySerializedState: () => LensSerializedState;
}

export type LensApi = Simplify<
  DefaultEmbeddableApi<LensSerializedAPIConfig> &
    // This is used by actions to operate the edit action
    HasEditCapabilities &
    // for blocking errors leverage the embeddable panel UI
    PublishesBlockingError &
    // This is used by dashboard/container to show filters/queries on the panel
    PublishesUnifiedSearch &
    // Forward the search session id
    PublishesSearchSession &
    // Let the container know the loading state
    PublishesDataLoading &
    // Let the container know when the rendering has completed rendering
    PublishesRendered &
    // Let the container know the used data views
    PublishesDataViews &
    // Let the container operate on panel title/description
    PublishesWritableTitle &
    PublishesWritableDescription &
    // This embeddable can narrow down specific triggers usage
    HasSupportedTriggers &
    PublishesDisabledActionIds &
    // Offers methods to operate from/on the linked saved object
    HasLibraryTransforms<LensSerializedAPIConfig, LensSerializedAPIConfig> &
    // Let the container know the view mode
    PublishesViewMode &
    // Let the container know the saved object id
    PublishesSavedObjectId &
    // Let the container know about unsaved changes
    PublishesUnsavedChanges &
    PublishesProjectRoutingOverrides &
    // Lens specific API methods:
    // Let the container know when the data has been loaded/updated
    LensInspectorAdapters &
    LensRequestHandlersProps &
    LensApiCallbacks &
    LensHasEditPanel &
    LegacyLensStateApi
>;

/**
 * Backward compatibility types
 */
export type LensEmbeddableOutput = LensApi;
