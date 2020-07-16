/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export const COVERAGE_INDEX = process.env.COVERAGE_INDEX || 'kibana_code_coverage';

export const TOTALS_INDEX = process.env.TOTALS_INDEX || `kibana_total_code_coverage`;

export const RESEARCH_COVERAGE_INDEX =
  process.env.RESEARCH_COVERAGE_INDEX || 'qa_research_code_coverage';

export const RESEARCH_TOTALS_INDEX =
  process.env.RESEARCH_TOTALS_INDEX || `qa_research_total_code_coverage`;

export const TEAM_ASSIGNMENT_PIPELINE_NAME = process.env.PIPELINE_NAME || 'team_assignment';

export const CODE_COVERAGE_CI_JOB_NAME = 'elastic+kibana+code-coverage';
export const RESEARCH_CI_JOB_NAME = 'elastic+kibana+qa-research';
export const CI_JOB_NAME = process.env.COVERAGE_JOB_NAME || RESEARCH_CI_JOB_NAME;
export const RESEARCH_CLUSTER_ES_HOST = process.env.ES_HOST || 'http://localhost:9200';
