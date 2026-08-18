/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Sha256 } from '@kbn/crypto-browser';

/**
 * SHA-256 of a UTF-8 string, hex-encoded.
 *
 * Uses the pure-JS implementation from `@kbn/crypto-browser` so the same code
 * path runs in browser, Node, and jest (jsdom) environments. Mirrors the
 * fallback used by `@kbn/esql-utils` so `EsqlSource` ids match those produced
 * by the existing `getESQLAdHocDataview` helper for backward compatibility.
 */
export const sha256 = async (input: string): Promise<string> =>
  new Sha256().update(input).digest('hex');
