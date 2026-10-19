/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from './schema';
export declare const isKibanaWorkflowStepType: (stepType: string) => boolean;
export declare const stepHasIgnoredKibanaFetcher: (step: {
  type?: string;
  with?: unknown;
}) => boolean;
type DiagnosticPath = Array<string | number>;
export interface IgnoredKibanaFetcherOccurrence {
  path: DiagnosticPath;
  stepType: string;
  stepName?: string;
}
/** Core self-client ignores YAML `fetcher` for every `kibana.*` step. */
export declare const shouldWarnIgnoredKibanaFetcher: (
  stepType: string,
  warnKibanaFetcher: boolean
) => boolean;
/** Structural `WorkflowDiagnostic.path` values plus step type for ignored kibana `with.fetcher` settings. */
export declare const collectIgnoredKibanaFetcherOccurrences: (
  steps: WorkflowYaml['steps'] | undefined
) => IgnoredKibanaFetcherOccurrence[];
/** Structural `WorkflowDiagnostic.path` values for ignored kibana `with.fetcher` settings. */
export declare const collectIgnoredKibanaFetcherPaths: (
  steps: WorkflowYaml['steps'] | undefined
) => DiagnosticPath[];
/** Step names whose YAML still sets `with.fetcher` on a kibana.* step. */
export declare const collectIgnoredKibanaFetcherStepNames: (
  steps: WorkflowYaml['steps'] | undefined
) => string[];
export {};
