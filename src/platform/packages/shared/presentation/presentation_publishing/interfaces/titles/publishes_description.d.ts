/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesDescription {
  description$: PublishingSubject<string | undefined>;
  defaultDescription$?: PublishingSubject<string | undefined>;
}
export declare function getDescription(api: Partial<PublishesDescription>): string | undefined;
export type PublishesWritableDescription = PublishesDescription & {
  setDescription: (newTitle: string | undefined) => void;
};
export declare const apiPublishesDescription: (
  unknownApi: null | unknown
) => unknownApi is PublishesDescription;
export declare const apiPublishesWritableDescription: (
  unknownApi: null | unknown
) => unknownApi is PublishesWritableDescription;
