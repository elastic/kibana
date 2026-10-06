/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ReactContextTypeHit } from '../../types';
/**
 * Resolves the applicable highlight method for a field value.
 *
 * - DSL: we receive a clean fieldValue and a side list of substrings to be highlighted.
 *   Example:
 *   fieldValue = "lorem ipsum dolor"
 *   fieldName = "myField"
 *   hit = { highlight: { myField: ["ipsum", "dolor"] } }
 *   return = "lorem <mark>ipsum</mark> <mark>dolor</mark>"
 *
 * - ES|QL: we receive a fieldValue with inline <em> (or custom) tags.
 *   Example:
 *   fieldValue = "<em>lorem</em> ipsum <em>dolor</em>"
 *   fieldName = "myField"
 *   hit = { inline_highlights: { myField: { preTag: "<em>", postTag: "</em>" } } }
 *   return = "<mark>lorem</mark> ipsum <mark>dolor</mark>"
 */
export declare function getHighlightReact(
  fieldValue: string,
  fieldName: string | undefined,
  hit: ReactContextTypeHit | undefined
): React.ReactNode;
