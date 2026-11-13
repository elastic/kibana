/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Where a test is judged: a branch, over the builds of the pipelines judged together
 * (`judgedTogether`), or a branch of a pipeline judged on its own, over its builds only.
 */
export interface JudgedScope {
  branch: string;
  /** The pipeline judged on its own; absent for the pipelines judged together. */
  pipeline?: string;
}

/** Tells scopes apart, e.g. as a map key. */
export const scopeKey = ({ branch, pipeline }: JudgedScope): string =>
  pipeline === undefined ? branch : `${branch}\n${pipeline}`;

/** `main`, or `main in kibana-fips` for a pipeline judged on its own. */
export const describeScope = ({ branch, pipeline }: JudgedScope): string =>
  pipeline === undefined ? branch : `${branch} in ${pipeline}`;
