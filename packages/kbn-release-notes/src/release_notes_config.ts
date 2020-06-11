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

import { ArrayItem } from './lib';

/**
 * Exclude any PR from release notes that has a matching label. String
 * labels must match exactly, for more complicated use a RegExp
 */
export const IGNORE_LABELS: Array<RegExp | string> = [
  'Team:Docs',
  ':KibanaApp/fix-it-week',
  'reverted',
  /^test/,
  'non-issue',
  'jenkins',
  'build',
  'chore',
  'backport',
  'release_note:skip',
  'release_note:dev_docs',
];

export type Area = ArrayItem<typeof AREAS> | typeof UNKNOWN_AREA;
export type AsciidocSection = ArrayItem<typeof ASCIIDOC_SECTIONS> | typeof UNKNOWN_ASCIIDOC_SECTION;

/**
 * Define areas that are used to categorize changes in the release notes
 * based on the labels a PR has. the `labels` array can contain strings, which
 * are matched exactly, or regular expressions. The first area, in definition
 * order, which has a `label` which matches and label on a PR is the area
 * assigned to that PR.
 */
export const AREAS = [
  {
    printableName: 'Design',
    labels: ['Team:Design', 'Project:Accessibility'],
  },
  {
    printableName: 'Logstash',
    labels: ['App:Logstash', 'Feature:Logstash Pipelines'],
  },
  {
    printableName: 'Management',
    labels: [
      'Feature:license',
      'Feature:Console',
      'Feature:Search Profiler',
      'Feature:watcher',
      'Feature:Index Patterns',
      'Feature:Kibana Management',
      'Feature:Dev Tools',
      'Feature:Inspector',
      'Feature:Index Management',
      'Feature:Snapshot and Restore',
      'Team:Elasticsearch UI',
      'Feature:FieldFormatters',
      'Feature:CCR',
      'Feature:ILM',
      'Feature:Transforms',
    ],
  },
  {
    printableName: 'Monitoring',
    labels: ['Team:Monitoring', 'Feature:Telemetry', 'Feature:Stack Monitoring'],
  },
  {
    printableName: 'Operations',
    labels: ['Team:Operations', 'Feature:License'],
  },
  {
    printableName: 'Kibana UI',
    labels: ['Kibana UI', 'Team:Core UI', 'Feature:Header'],
  },
  {
    printableName: 'Platform',
    labels: [
      'Team:Platform',
      'Feature:Plugins',
      'Feature:New Platform',
      'Project:i18n',
      'Feature:ExpressionLanguage',
      'Feature:Saved Objects',
      'Team:Stack Services',
      'Feature:NP Migration',
      'Feature:Task Manager',
      'Team:Pulse',
    ],
  },
  {
    printableName: 'Machine Learning',
    labels: [
      ':ml',
      'Feature:Anomaly Detection',
      'Feature:Data Frames',
      'Feature:File Data Viz',
      'Feature:ml-results',
      'Feature:Data Frame Analytics',
    ],
  },
  {
    printableName: 'Maps',
    labels: ['Team:Geo'],
  },
  {
    printableName: 'Canvas',
    labels: ['Team:Canvas'],
  },
  {
    printableName: 'QA',
    labels: ['Team:QA'],
  },
  {
    printableName: 'Security',
    labels: [
      'Team:Security',
      'Feature:Security/Spaces',
      'Feature:users and roles',
      'Feature:Security/Authentication',
      'Feature:Security/Authorization',
      'Feature:Security/Feature Controls',
    ],
  },
  {
    printableName: 'Dashboard',
    labels: ['Feature:Dashboard', 'Feature:Drilldowns'],
  },
  {
    printableName: 'Discover',
    labels: ['Feature:Discover'],
  },
  {
    printableName: 'Kibana Home & Add Data',
    labels: ['Feature:Add Data', 'Feature:Home'],
  },
  {
    printableName: 'Querying & Filtering',
    labels: [
      'Feature:Query Bar',
      'Feature:Courier',
      'Feature:Filters',
      'Feature:Timepicker',
      'Feature:Highlight',
      'Feature:KQL',
      'Feature:Rollups',
    ],
  },
  {
    printableName: 'Reporting',
    labels: ['Feature:Reporting', 'Team:Reporting Services'],
  },
  {
    printableName: 'Sharing',
    labels: ['Feature:Embedding', 'Feature:SharingURLs'],
  },
  {
    printableName: 'Visualizations',
    labels: [
      'Feature:Timelion',
      'Feature:TSVB',
      'Feature:Coordinate Map',
      'Feature:Region Map',
      'Feature:Vega',
      'Feature:Gauge Vis',
      'Feature:Tagcloud',
      'Feature:Vis Loader',
      'Feature:Vislib',
      'Feature:Vis Editor',
      'Feature:Aggregations',
      'Feature:Input Control',
      'Feature:Visualizations',
      'Feature:Markdown',
      'Feature:Data Table',
      'Feature:Heatmap',
      'Feature:Pie Chart',
      'Feature:XYAxis',
      'Feature:Graph',
      'Feature:New Feature',
      'Feature:MetricVis',
    ],
  },
  {
    printableName: 'SIEM',
    labels: ['Team:SIEM'],
  },
  {
    printableName: 'Code',
    labels: ['Team:Code'],
  },
  {
    printableName: 'Infrastructure',
    labels: ['App:Infrastructure', 'Feature:Infra UI', 'Feature:Service Maps'],
  },
  {
    printableName: 'Logs',
    labels: ['App:Logs', 'Feature:Logs UI'],
  },
  {
    printableName: 'Uptime',
    labels: ['App:Uptime', 'Feature:Uptime', 'Team:uptime'],
  },
  {
    printableName: 'Beats Management',
    labels: ['App:Beats', 'Feature:beats-cm', 'Team:Beats'],
  },
  {
    printableName: 'APM',
    labels: ['Team:apm', /^apm[:\-]/],
  },
  {
    printableName: 'Lens',
    labels: ['App:Lens', 'Feature:Lens'],
  },
  {
    printableName: 'Alerting',
    labels: ['App:Alerting', 'Feature:Alerting', 'Team:Alerting Services', 'Feature:Actions'],
  },
  {
    printableName: 'Metrics',
    labels: ['App:Metrics', 'Feature:Metrics UI', 'Team:logs-metrics-ui'],
  },
  {
    printableName: 'Data ingest',
    labels: ['Ingest', 'Feature:Ingest Node Pipelines'],
  },
] as const;

export const UNKNOWN_AREA = {
  printableName: 'Unknown',
  labels: [],
} as const;

/**
 * Define the sections that will be assigned to PRs when generating the
 * asciidoc formatted report. The order of the sections determines the
 * order they will be rendered in the report
 */
export const ASCIIDOC_SECTIONS = [
  {
    id: 'enhancement',
    title: 'Enhancements',
    labels: ['release_note:enhancement'],
  },
  {
    id: 'bug',
    title: 'Bug fixes',
    labels: ['release_note:fix'],
  },
  {
    id: 'roadmap',
    title: 'Roadmap',
    labels: ['release_note:roadmap'],
  },
  {
    id: 'deprecation',
    title: 'Deprecations',
    labels: ['release_note:deprecation'],
  },
  {
    id: 'breaking',
    title: 'Breaking Changes',
    labels: ['release_note:breaking'],
  },
] as const;

export const UNKNOWN_ASCIIDOC_SECTION = {
  id: 'unknown',
  title: 'Unknown',
  labels: [],
} as const;
