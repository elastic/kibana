/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  FLAKINESS_REPORT_SCHEMA_VERSION,
  FailureSampleSchema,
  FlakinessReportSchema,
  FlakyClusterSchema,
  FlakyTestUnitSchema,
  MechanismSchema,
  PolicySnapshotSchema,
  SpecObservationSchema,
  SuppressedSchema,
  SuppressionReasonSchema,
  TestObservationSchema,
} from './src/report/schema';

export type {
  FailureSample,
  FlakinessReport,
  FlakyCluster,
  FlakyTestUnit,
  Mechanism,
  PolicySnapshot,
  SpecObservation,
  Suppressed,
  SuppressionReason,
  TestObservation,
} from './src/report/schema';

export { DEFAULT_CONFIDENCE_Z, wilsonLowerBound } from './src/policy/wilson';
export { DEFAULT_POLICY, admitSpec, partitionSpecs, resolveThreshold } from './src/policy/policy';
export type { AdmissionResult } from './src/policy/policy';

export {
  classifyMechanism,
  dominantMechanism,
  isFixCandidate,
  normalizeErrorMessage,
} from './src/mechanism/classify';

export {
  buildSpecClusters,
  collapseTestUnits,
  specClusterKey,
} from './src/clustering/spec_clusters';
export type {
  BuildSpecClustersOptions,
  BuildSpecClustersResult,
} from './src/clustering/spec_clusters';

export {
  fetchFailureSamples,
  fetchSpecObservations,
  fetchTestObservations,
  quoteEsqlString,
} from './src/query/flakiness_query';
export type { FlakinessQueryScope } from './src/query/flakiness_query';

export { analyzeFlakiness, readReportFromFile, writeReportToFile } from './src/analyze';
export type { AnalyzeFlakinessOptions } from './src/analyze';

export { renderSummary } from './src/report/summary';

export { runAnalyzeFlakinessCli } from './src/cli/analyze_flakiness';
