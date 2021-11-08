/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const SubOrgToOrg: { [key: string]: string[] } = {
  Stack: ['MachineLearningUI', 'Logstash', 'Kibana'],
  SecuritySolution: ['SecuritySolution'],
  Observability: ['Observability'],
  RAC: ['RAC'],
  EnterpriseSearch: ['EnterpriseSearch'],
};

export const GroupToSubOrg: { [key: string]: string[] } = {
  Kibana: ['Platform', 'StackManagement', 'Analyze'],
  Logstash: ['Logstash'],
  MachineLearningUI: ['MachineLearningUI'],
  SecuritySolution: ['SecuritySolution'],
  Observability: ['Observability'],
  RAC: ['RAC'],
  EnterpriseSearch: ['EnterpriseSearch'],
};

export const GroupToTeam: { [key: string]: string[] } = {
  Analyze: ['KibanaPresentation', 'VisEditors', 'DataDiscovery', 'GIS'],
  StackManagement: ['StackManagement'],
  Platform: [
    'KibanaAlerting',
    'KibanaLocalization',
    'KibanaCore',
    'KibanaTelemetry',
    'PlatformSecurity',
    'AppServices',
    'KibanaReportingServices',
  ],
  Logstash: ['Logstash'],
  MachineLearningUI: ['MachineLearningUI'],
  SecuritySolution: [
    'Securitysolution',
    'SecuritySolutionThreatHunting',
    'Securityassetmanagement',
    'Securitydetectionsresponse',
  ],
  Observability: [
    'ObservabilityUI',
    'StackMonitoring',
    'LogsandMetricsUI',
    'APMUI',
    'Fleet',
    'Uptime',
  ],
  RAC: ['RAC'],
  EnterpriseSearch: ['EnterpriseSearch'],
};

export const TeamToSize: { [key: string]: number } = {
  // Kibana teams:
  KibanaPresentation: 5,
  VisEditors: 4,
  DataDiscovery: 3,
  GIS: 5,
  StackManagement: 5,
  KibanaAlerting: 5,
  KibanaCore: 4, // Core team is 7, borrowed 2 for telemetry.
  KibanaLocalization: 1, // Core team, 1 more borrowed for localization.
  KibanaTelemetry: 2,
  PlatformSecurity: 4,
  AppServices: 7, // 8 total for App Services, giving one to Reporting however, as they are in the same area team.
  KibanaReportingServices: 1,
  // Logstash
  Logstash: 6,
  // ML:
  MachineLearningUI: 5, // Only tracking UI folks
  // Observability Teams:
  ObservabilityUI: 2, // Using the folks in the unified observability in the org chart, though lots of area teams apparently put stuff here.
  LogsandMetricsUI: 3, // Half of the Infrastructure Monitoring UI team which also owns Stack Monitoring so I don't count folks twice
  StackMonitoring: 4, // 7 folks total in Infrastructure Monitoring UI , but they own both thos and Logs and metrics.
  APMUI: 7,
  Fleet: 5,
  Uptime: 9, //
  // Security solution:
  Securitysolution: 3, // For lack of knowing which team to put here, I put the Analyst -> Security Platform team size
  SecuritySolutionThreatHunting: 11,
  Securityassetmanagement: 2,
  Securitydetectionsresponse: 9,
  // RAC
  RAC: 1, // RAC folks are entirely borrowed from other teams so I have no idea how to count them uniquely
  // Enterprise Search
  EnterpriseSearch: 8, // Only picking folks from App Search, their Kibana footprint is pretty small.
};
