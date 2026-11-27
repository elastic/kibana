/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EdotSpan, EdotSpanDocument } from '../edot_shared/edot_span';

export const MOBILE_SPAN_KIND = {
  CLIENT: 'Client',
  INTERNAL: 'Internal',
  SERVER: 'Server',
} as const;

export const MOBILE_SPAN_STATUS = {
  UNSET: 'Unset',
  OK: 'Ok',
  ERROR: 'Error',
} as const;

export type EdotReactNativeSpanKind = (typeof MOBILE_SPAN_KIND)[keyof typeof MOBILE_SPAN_KIND];
export type EdotReactNativeSpanStatus =
  (typeof MOBILE_SPAN_STATUS)[keyof typeof MOBILE_SPAN_STATUS];

export type EdotReactNativeSpanDocument = EdotSpanDocument<
  EdotReactNativeSpanKind,
  EdotReactNativeSpanStatus
>;

/** OTel-native span of EDOT Android or EDOT iOS. */
export type EdotReactNativeSpan = EdotSpan<EdotReactNativeSpanDocument>;
