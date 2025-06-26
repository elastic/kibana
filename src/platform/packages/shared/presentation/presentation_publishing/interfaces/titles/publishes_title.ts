/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublishingSubject } from '../../publishing_subject';

export interface PublishesTitle {
  title$: PublishingSubject<string | undefined>;
  hideTitle$: PublishingSubject<boolean | undefined>;
  defaultTitle$?: PublishingSubject<string | undefined>;
}

export function getTitle(api: Partial<PublishesTitle>): string | undefined {
  return api.title$?.value ?? api.defaultTitle$?.value;
}

export type PublishesWritableTitle = PublishesTitle & {
  setTitle: (newTitle: string | undefined) => void;
  setHideTitle: (hide: boolean | undefined) => void;
};

export const apiPublishesTitle = (unknownApi: null | unknown): unknownApi is PublishesTitle => {
  return Boolean(
    unknownApi &&
      (unknownApi as PublishesTitle)?.title$ !== undefined &&
      (unknownApi as PublishesTitle)?.hideTitle$ !== undefined
  );
};

export const apiPublishesWritableTitle = (
  unknownApi: null | unknown
): unknownApi is PublishesWritableTitle => {
  return (
    apiPublishesTitle(unknownApi) &&
    (unknownApi as PublishesWritableTitle).setTitle !== undefined &&
    (typeof (unknownApi as PublishesWritableTitle).setTitle === 'function' &&
      (unknownApi as PublishesWritableTitle).setHideTitle) !== undefined &&
    typeof (unknownApi as PublishesWritableTitle).setHideTitle === 'function'
  );
};
