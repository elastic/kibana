/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import type { ContentListItem } from '../../item';
import type { ContentEditorConfig, ContentEditorSaveArgs } from './types';
import { DefaultActivityRows } from './default_activity_rows';

/**
 * Dependencies required to resolve content editor defaults.
 */
export interface ResolveContentEditorDeps {
  /** Core services for saved objects client. */
  core: CoreStart;
  /** The saved object type (e.g., 'dashboard', 'map'). */
  savedObjectType: string;
  /** Plural entity name for activity view. */
  entityNamePlural: string;
}

/**
 * Reference structure from the saved objects API.
 */
interface SavedObjectReference {
  type: string;
  id: string;
  name: string;
}

/**
 * Response structure from the saved objects GET API.
 */
interface SavedObjectGetResponse {
  references?: SavedObjectReference[];
  [key: string]: unknown;
}

/**
 * Creates a default save handler using the saved objects HTTP API.
 *
 * This handler updates the saved object's `title` and `description` attributes,
 * and updates tag references via the `/api/saved_objects/{type}/{id}` endpoint.
 *
 * IMPORTANT: This handler preserves existing non-tag references (e.g., index patterns,
 * layers) to avoid corrupting saved objects that have complex reference structures.
 */
export const createDefaultOnSave = (
  core: CoreStart,
  savedObjectType: string
): ContentEditorConfig['onSave'] => {
  return async ({ id, title, description, tags }: ContentEditorSaveArgs) => {
    // First, fetch the current saved object to get its existing references.
    // We need to preserve non-tag references (index patterns, layers, etc.).
    const currentObject = await core.http.get<SavedObjectGetResponse>(
      `/api/saved_objects/${savedObjectType}/${id}`
    );

    // Filter out existing tag references (we'll replace them with the new ones).
    const existingNonTagReferences = (currentObject.references ?? []).filter(
      (ref) => ref.type !== 'tag'
    );

    // Build new tag references in the expected saved objects format.
    const tagReferences = tags.map((tagId) => ({
      type: 'tag' as const,
      id: tagId,
      name: `tag-${tagId}`,
    }));

    // Merge existing non-tag references with new tag references.
    const mergedReferences = [...existingNonTagReferences, ...tagReferences];

    // Update the saved object via HTTP API.
    // Uses the public saved objects API endpoint.
    await core.http.put(`/api/saved_objects/${savedObjectType}/${id}`, {
      body: JSON.stringify({
        attributes: { title, description },
        references: mergedReferences,
      }),
    });
  };
};

/**
 * Creates an appendRows function that renders activity view.
 *
 * NOTE: This is NOT used by default because it requires the plugin to have
 * registered content insights routes on the server side via `registerContentInsights()`.
 * Plugins that want activity view should explicitly configure `appendRows` or call
 * this helper after ensuring their server plugin has the required routes.
 *
 * @example
 * ```tsx
 * // Only use if your plugin has registered content insights routes!
 * features={{
 *   contentEditor: {
 *     appendRows: createActivityAppendRows(contentInsightsClient, entityNamePlural),
 *   }
 * }}
 * ```
 */
export const createActivityAppendRows = (
  contentInsightsClient: ContentInsightsClientPublic,
  entityNamePlural: string
): ContentEditorConfig['appendRows'] => {
  return (item: ContentListItem) => (
    <DefaultActivityRows
      item={item}
      entityNamePlural={entityNamePlural}
      contentInsightsClient={contentInsightsClient}
    />
  );
};

/**
 * Resolves the content editor configuration, applying defaults where needed.
 *
 * When `contentEditor: true` is passed, this creates a fully functional config
 * using the saved objects client for saving.
 *
 * @param config - The raw config value (`boolean` or `ContentEditorConfig`).
 * @param deps - Dependencies for creating default handlers.
 * @returns Resolved `ContentEditorConfig` or `undefined` if not enabled.
 */
export const resolveContentEditorConfig = (
  config: boolean | ContentEditorConfig | undefined,
  deps: ResolveContentEditorDeps
): ContentEditorConfig | undefined => {
  // Not enabled (undefined or false).
  if (!config) {
    return undefined;
  }

  const { core, savedObjectType } = deps;

  // Shorthand: `contentEditor: true` means use all defaults.
  // NOTE: appendRows is NOT auto-wired because it requires the plugin to have
  // registered content insights routes on the server side.
  if (config === true) {
    return {
      onSave: createDefaultOnSave(core, savedObjectType),
    };
  }

  // Object config: use provided values, fall back to defaults for unspecified options.
  return {
    ...config,
    onSave: config.onSave ?? createDefaultOnSave(core, savedObjectType),
  };
};
