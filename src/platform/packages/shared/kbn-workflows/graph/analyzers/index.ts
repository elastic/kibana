/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  analyzeLoops,
  validateNoUnintentionalLoops,
  getLoopAnalysisSummary,
} from './loop_detection_analyzer';

export type { DetectedLoop, LoopType, LoopDetectionResult } from './loop_detection_analyzer';

export {
  analyzeErrorPatterns,
  getErrorPatternAnalysisSummary,
  validateErrorHandling,
} from './error_pattern_analyzer';

export type {
  DetectedErrorPattern,
  ErrorPatternType,
  ErrorPatternSeverity,
  ErrorPatternIssue,
  ErrorPatternAnalysisResult,
  ErrorPatternSummary,
} from './error_pattern_analyzer';
