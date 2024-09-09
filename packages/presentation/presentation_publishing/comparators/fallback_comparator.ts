/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { PublishingSubject } from '../publishing_subject';
import { ComparatorDefinition } from './types';

/**
 * Comparators are required for every runtime state key. Occasionally, a comparator may
 * actually be optional. In those cases, implementors can fall back to this blank definition
 * which will always return 'true'.
 */
export const getUnchangingComparator = <
  State extends object,
  Key extends keyof State
>(): ComparatorDefinition<State, Key> => {
  const subj = new BehaviorSubject<never>(null as never);
  return [subj as unknown as PublishingSubject<State[Key]>, () => {}, () => true];
};
