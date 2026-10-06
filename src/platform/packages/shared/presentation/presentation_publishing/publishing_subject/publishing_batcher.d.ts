/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject, UnwrapPublishingSubjectTuple } from './types';
/**
 * Batches the latest values of multiple publishing subjects into a single object. Use this to avoid unnecessary re-renders.
 * Use when `subjects` are static and do not change over the lifetime of the component.
 *
 * Do not use when value is used as an input value to avoid debouncing user interactions
 *
 * @param subjects Publishing subjects array.
 */
export declare const useBatchedPublishingSubjects: <
  SubjectsType extends [...Array<PublishingSubject<any>>]
>(
  ...subjects: [...SubjectsType]
) => UnwrapPublishingSubjectTuple<SubjectsType>;
