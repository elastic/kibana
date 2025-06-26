/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const COVERAGE_INDEX = process.env.COVERAGE_INDEX || 'kibana_code_coverage';

export const TOTALS_INDEX = process.env.TOTALS_INDEX || `kibana_total_code_coverage`;

export const RESEARCH_COVERAGE_INDEX =
  process.env.RESEARCH_COVERAGE_INDEX || 'qa_research_code_coverage';

export const RESEARCH_TOTALS_INDEX =
  process.env.RESEARCH_TOTALS_INDEX || `qa_research_total_code_coverage`;

export const CODE_COVERAGE_CI_JOB_NAME = 'elastic+kibana+code-coverage';
export const RESEARCH_CI_JOB_NAME = 'elastic+kibana+qa-research';
export const CI_JOB_NAME = process.env.COVERAGE_JOB_NAME || RESEARCH_CI_JOB_NAME;
export const ES_HOST = process.env.ES_HOST || 'http://localhost:9200';
