/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The group name of a binary expression. Groups are ordered by precedence.
 */
export enum BinaryExpressionGroup {
  unknown = 0,
  additive = 10,
  multiplicative = 20,
  assignment = 30,
  comparison = 40,
  regex = 50,
}
