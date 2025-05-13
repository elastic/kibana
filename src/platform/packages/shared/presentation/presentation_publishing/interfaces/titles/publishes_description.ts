/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublishingSubject } from '../../publishing_subject';

export interface PublishesDescription {
  description$: PublishingSubject<string | undefined>;
  defaultDescription$?: PublishingSubject<string | undefined>;
}

export function getDescription(api: Partial<PublishesDescription>): string | undefined {
  return api.description$?.value ?? api.defaultDescription$?.value;
}

export type PublishesWritableDescription = PublishesDescription & {
  setDescription: (newTitle: string | undefined) => void;
};

export const apiPublishesDescription = (
  unknownApi: null | unknown
): unknownApi is PublishesDescription => {
  return Boolean(unknownApi && (unknownApi as PublishesDescription)?.description$ !== undefined);
};

export const apiPublishesWritableDescription = (
  unknownApi: null | unknown
): unknownApi is PublishesWritableDescription => {
  return (
    apiPublishesDescription(unknownApi) &&
    (unknownApi as PublishesWritableDescription).setDescription !== undefined &&
    typeof (unknownApi as PublishesWritableDescription).setDescription === 'function'
  );
};
