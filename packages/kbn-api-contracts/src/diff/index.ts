/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { runOasdiff } from './run_oasdiff';
export { runOasdiffStructural } from './run_oasdiff_structural';
export { parseOasdiff } from './parse_oasdiff';
export type { OasdiffEntry } from './parse_oasdiff';
export { applyAllowlist } from './breaking_rules';
export type { BreakingChange, FilterResult } from './breaking_rules';
export { buildRequestBodyIndex } from './build_request_body_index';
export type { RequestBodyIndex, RequestBodyConsumer } from './build_request_body_index';
export {
  detectAdditionalPropertiesTightening,
  REQUEST_ADDITIONAL_PROPERTIES_TIGHTENED_ID,
} from './detect_additional_properties_tightening';
