/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EdotBrowserSpanDocument } from '../edot_browser/edot_browser_span';
import { Serializable } from '../serializable';

export type EdotReactNativeSpanDocument = Omit<EdotBrowserSpanDocument, 'kind' | 'status'> & {
  kind: 'Client' | 'Internal';
  status: { code: 'Unset' | 'Ok' | 'Error' };
};

/** OTel-native span of EDOT Android or EDOT iOS, as stored by the Elasticsearch exporter. */
export class EdotReactNativeSpan extends Serializable<EdotReactNativeSpanDocument> {
  duration(durationMs: number) {
    this.fields.duration = Math.round(durationMs * 1_000_000);
    return this;
  }
}
