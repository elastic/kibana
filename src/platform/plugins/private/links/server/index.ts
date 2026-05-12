/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  DashboardLink,
  ExternalLink,
  ExternalLinkOptions,
  Link,
  LinkOptions,
  LinksState,
  StoredDashboardLink,
  StoredLinksState,
} from './links_saved_object';

export type {
  LinksByValueState,
  LinksByReferenceState,
  LinksEmbeddableState,
} from './links_saved_object/embeddable_schemas';

export const plugin = async () => {
  const { LinksServerPlugin } = await import('./plugin');
  return new LinksServerPlugin();
};
