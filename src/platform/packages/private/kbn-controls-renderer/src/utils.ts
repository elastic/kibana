/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HasPrependWrapperRef, PublishesControlsLayout } from './types';

export const apiPublishesControlsLayout = (api: unknown): api is PublishesControlsLayout => {
  return Boolean(
    (api as PublishesControlsLayout).layout$ &&
      Object.keys((api as PublishesControlsLayout).layout$.getValue()).includes('controls')
  );
};

export const apiHasPrependWrapperRef = (api: unknown): api is HasPrependWrapperRef =>
  Boolean((api as HasPrependWrapperRef).prependWrapperRef);
