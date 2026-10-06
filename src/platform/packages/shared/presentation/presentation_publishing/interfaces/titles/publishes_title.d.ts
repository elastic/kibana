/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesTitle {
  title$: PublishingSubject<string | undefined>;
  hideTitle$: PublishingSubject<boolean | undefined>;
  defaultTitle$?: PublishingSubject<string | undefined>;
}
export declare function getTitle(api: Partial<PublishesTitle>): string | undefined;
export type PublishesWritableTitle = PublishesTitle & {
  setTitle: (newTitle: string | undefined) => void;
  setHideTitle: (hide: boolean | undefined) => void;
};
export declare const apiPublishesTitle: (
  unknownApi: null | unknown
) => unknownApi is PublishesTitle;
export declare const apiPublishesWritableTitle: (
  unknownApi: null | unknown
) => unknownApi is PublishesWritableTitle;
