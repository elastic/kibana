/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum HostsQueries {
  details = 'hostDetails',
  hosts = 'hosts',
  overview = 'overviewHost',
  uncommonProcesses = 'uncommonProcesses',
}

export enum UsersQueries {
  observedDetails = 'observedUserDetails',
  managedDetails = 'managedUserDetails',
  users = 'allUsers',
  authentications = 'authentications',
}

export enum ServicesQueries {
  observedDetails = 'observedServiceDetails',
}

export enum NetworkQueries {
  details = 'networkDetails',
  dns = 'dns',
  http = 'http',
  overview = 'overviewNetwork',
  tls = 'tls',
  topCountries = 'topCountries',
  topNFlowCount = 'topNFlowCount',
  topNFlow = 'topNFlow',
  users = 'users',
}

export enum EntityRiskQueries {
  list = 'listEntitiesRiskScore',
  kpi = 'kpiRiskScore',
}

export enum CtiQueries {
  eventEnrichment = 'eventEnrichment',
  dataSource = 'dataSource',
}

export const FirstLastSeenQuery = 'firstlastseen';

export enum RelatedEntitiesQueries {
  relatedHosts = 'relatedHosts',
  relatedUsers = 'relatedUsers',
}

export type FactoryQueryTypes =
  | HostsQueries
  | UsersQueries
  | ServicesQueries
  | NetworkQueries
  | EntityRiskQueries
  | CtiQueries
  | typeof FirstLastSeenQuery
  | RelatedEntitiesQueries;
