/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTitles } from '@kbn/presentation-publishing';
import type { DashboardLink, ExternalLink, LinksState } from '../../server';

export type LinksEmbeddableState = SerializedTitles &
  (LinksState | { savedObjectId: string });

export type StoredLinksEmbeddableState = SerializedTitles & StoredLinksState;

export type StoredLinksState = Omit<LinksState, 'links'> & {
  links?: Array<StoredDashboardLink | ExternalLink>
};

export type StoredDashboardLink = Omit<DashboardLink, 'destination'> & {
  destinationRefName: string;
}