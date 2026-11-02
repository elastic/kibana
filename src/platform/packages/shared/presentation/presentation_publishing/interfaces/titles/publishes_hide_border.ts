/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../../publishing_subject';

export interface PublishesHideBorder {
  hideBorder$: PublishingSubject<boolean | undefined>;
}

export type PublishesWritableHideBorder = PublishesHideBorder & {
  setHideBorder: (hideBorder: boolean | undefined) => void;
};

export const apiPublishesHideBorder = (
  unknownApi: unknown | null
): unknownApi is PublishesHideBorder =>
  Boolean(unknownApi && (unknownApi as PublishesHideBorder).hideBorder$);

export const apiPublishesWritableHideBorder = (
  unknownApi: unknown | null
): unknownApi is PublishesWritableHideBorder =>
  Boolean(
    apiPublishesHideBorder(unknownApi) && (unknownApi as PublishesWritableHideBorder).setHideBorder
  );
