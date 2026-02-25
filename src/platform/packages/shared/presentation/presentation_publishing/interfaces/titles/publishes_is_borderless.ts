/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../../publishing_subject';

export interface PublishesIsBorderless {
  isBorderless$: PublishingSubject<boolean | undefined>;
}

export type PublishesWritableIsBorderless = PublishesIsBorderless & {
  setIsBorderless: (borderless: boolean | undefined) => void;
};

export const apiPublishesIsBorderless = (
  unknownApi: unknown | null
): unknownApi is PublishesIsBorderless =>
  Boolean(unknownApi && (unknownApi as PublishesIsBorderless).isBorderless$);

export const apiPublishesWritableIsBorderless = (
  unknownApi: unknown | null
): unknownApi is PublishesWritableIsBorderless =>
  Boolean(
    apiPublishesIsBorderless(unknownApi) &&
      (unknownApi as PublishesWritableIsBorderless).setIsBorderless
  );
