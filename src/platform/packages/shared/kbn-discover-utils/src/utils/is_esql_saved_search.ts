/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @deprecated This should only be used in combination with {@link isEsqlSavedSearch}
 */
export interface DiscoverSessionFinderAttributes {
  tabs?: Array<{ attributes: { isTextBasedQuery?: boolean } }>;
}

/**
 * @deprecated This is only used in specific legacy conditions:
 * - Within a `showSavedObject` callback passed to `SavedObjectFinder`
 * - When the Discover session is being used as a legacy saved search
 * - When the app does not support ES|QL saved searches (e.g. agg-based vis)
 */
export const isEsqlSavedSearch = (savedObject: { attributes: DiscoverSessionFinderAttributes }) =>
  savedObject.attributes.tabs?.[0]?.attributes.isTextBasedQuery === true;
