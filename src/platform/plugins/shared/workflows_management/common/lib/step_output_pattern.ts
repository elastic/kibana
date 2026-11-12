/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';

const QUOTED_KEY = `\\\\?["']([^"'\\\\]+)\\\\?["']`;

/**
 * Matches `steps.<stepName>.output[.<field>]` (dot or bracket notation, quotes optionally escaped
 * as in serialized JSON). The field is in capture group 1 (dot) or 2 (bracket), absent for `output`.
 */
export const createStepOutputPattern = (stepName: string): RegExp => {
  const name = escapeRegExp(stepName);
  return new RegExp(
    `steps(?:\\.${name}|\\[\\\\?["']${name}\\\\?["']\\])\\.output(?:\\.([A-Za-z_][\\w-]*)|\\[${QUOTED_KEY}\\])?`,
    'g'
  );
};
