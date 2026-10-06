/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject, ValueFromPublishingSubject } from './types';
/**
 * Declares a publishing subject, allowing external code to subscribe to react state changes.
 * Changes to state fire subject.next
 * @param state React state from useState hook.
 */
export declare const usePublishingSubject: <T extends unknown = unknown>(
  state: T
) => PublishingSubject<T>;
/**
 * Declares a state variable that is synced with a publishing subject value.
 * @param subject Publishing subject.
 */
export declare const useStateFromPublishingSubject: <SubjectType extends PublishingSubject<any>>(
  subject: SubjectType
) => ValueFromPublishingSubject<SubjectType>;
