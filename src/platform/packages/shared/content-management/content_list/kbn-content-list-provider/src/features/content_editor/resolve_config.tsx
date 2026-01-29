/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import type { ContentListItem } from '../../item';
import type { ContentEditorConfig } from './types';
import { DefaultActivityRows } from './default_activity_rows';

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
