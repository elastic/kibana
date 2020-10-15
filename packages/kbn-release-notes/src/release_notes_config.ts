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

/**
 * Define areas that are used to categorize changes in the release notes
 * based on the labels a PR has. the `labels` array can contain strings, which
 * are matched exactly, or regular expressions. The first area, in definition
 * order, which has a `label` which matches and label on a PR is the area
 * assigned to that PR.
 */

export interface Area {
  title: string;
  labels: Array<string | RegExp>;
}

export const AREAS: Area[] = [
  {
    title: 'Design',
    labels: ['Team:Design', 'Project:Accessibility'],
  },
  {
    title: 'Logstash',
    labels: ['App:Logstash', 'Feature:Logstash Pipelines'],
  },
  {
    title: 'Management',
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
    title: 'Monitoring',
    labels: ['Team:Monitoring', 'Feature:Telemetry', 'Feature:Stack Monitoring'],
  },
  {
    title: 'Operations',
    labels: ['Team:Operations', 'Feature:License'],
  },
  {
    title: 'Kibana UI',
    labels: ['Kibana UI', 'Team:Core UI', 'Feature:Header'],
  },
  {
    title: 'Platform',
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
    title: 'Machine Learning',
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
    title: 'Maps',
    labels: ['Team:Geo'],
  },
  {
    title: 'Canvas',
    labels: ['Team:Canvas'],
  },
  {
    title: 'QA',
    labels: ['Team:QA'],
  },
  {
    title: 'Security',
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
    title: 'Dashboard',
    labels: ['Feature:Dashboard', 'Feature:Drilldowns'],
  },
  {
    title: 'Discover',
    labels: ['Feature:Discover'],
  },
  {
    title: 'Kibana Home & Add Data',
    labels: ['Feature:Add Data', 'Feature:Home'],
  },
  {
    title: 'Querying & Filtering',
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
    title: 'Reporting',
    labels: ['Feature:Reporting', 'Team:Reporting Services'],
  },
  {
    title: 'Sharing',
    labels: ['Feature:Embedding', 'Feature:SharingURLs'],
  },
  {
    title: 'Visualizations',
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
    title: 'SIEM',
    labels: ['Team:SIEM'],
  },
  {
    title: 'Code',
    labels: ['Team:Code'],
  },
  {
    title: 'Infrastructure',
    labels: ['App:Infrastructure', 'Feature:Infra UI', 'Feature:Service Maps'],
  },
  {
    title: 'Logs',
    labels: ['App:Logs', 'Feature:Logs UI'],
  },
  {
    title: 'Uptime',
    labels: ['App:Uptime', 'Feature:Uptime', 'Team:uptime'],
  },
  {
    title: 'Beats Management',
    labels: ['App:Beats', 'Feature:beats-cm', 'Team:Beats'],
  },
  {
    title: 'APM',
    labels: ['Team:apm', /^apm[:\-]/],
  },
  {
    title: 'Lens',
    labels: ['App:Lens', 'Feature:Lens'],
  },
  {
    title: 'Alerting',
    labels: ['App:Alerting', 'Feature:Alerting', 'Team:Alerting Services', 'Feature:Actions'],
  },
  {
    title: 'Metrics',
    labels: ['App:Metrics', 'Feature:Metrics UI', 'Team:logs-metrics-ui'],
  },
  {
    title: 'Data ingest',
    labels: ['Ingest', 'Feature:Ingest Node Pipelines'],
  },
];

export const UNKNOWN_AREA: Area = {
  title: 'Unknown',
  labels: [],
};

/**
 * Define the sections that will be assigned to PRs when generating the
 * asciidoc formatted report. The order of the sections determines the
 * order they will be rendered in the report
 */

export interface AsciidocSection {
  title: string;
  labels: Array<string | RegExp>;
  id: string;
}

export const ASCIIDOC_SECTIONS: AsciidocSection[] = [
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
];

export const UNKNOWN_ASCIIDOC_SECTION: AsciidocSection = {
  id: 'unknown',
  title: 'Unknown',
  labels: [],
};
