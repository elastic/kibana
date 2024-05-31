/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

/**
 * A publishing subject is a RxJS subject that can be used to listen to value changes, but does not allow pushing values via the Next method.
 */
export type PublishingSubject<T extends unknown = unknown> = Omit<BehaviorSubject<T>, 'next'>;

// Usage of any required here. We want to build functionalities that can work with a publishing subject of any type.
type AnyValue = any;

export type AnyPublishingSubject = PublishingSubject<AnyValue> | undefined;

export type ValueFromPublishingSubject<
  T extends PublishingSubject<AnyValue> | undefined = PublishingSubject<AnyValue> | undefined
> = T extends PublishingSubject<infer ValueType>
  ? ValueType
  : T extends undefined
  ? undefined
  : never;

export type UnwrapPublishingSubjectTuple<T extends [...any[]]> = T extends [
  infer Head extends AnyPublishingSubject,
  ...infer Tail extends AnyPublishingSubject[]
]
  ? [ValueFromPublishingSubject<Head>, ...UnwrapPublishingSubjectTuple<Tail>]
  : [];
