/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '@kbn/presentation-publishing';

/** A parent, such as a dashboard, that publishes whether it has a flyout or other overlay open. */
export interface PublishesHasOverlays {
  hasOverlays$: PublishingSubject<boolean>;
}

export const apiPublishesHasOverlays = (api: unknown): api is PublishesHasOverlays =>
  typeof api === 'object' &&
  api !== null &&
  'hasOverlays$' in api &&
  api.hasOverlays$ !== undefined;
