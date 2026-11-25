/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const TREND_VISION_ONE_CONNECTOR_TYPE_ID = '.trend_vision_one';
export const VENDOR = 'TrendAI Vision One';

/** United States, the first region of the product's API reference. */
export const DEFAULT_API_URL = 'https://api.xdr.trendmicro.com';

/** The documented regional API hosts, as listed in the product's API reference. */
export const REGION_HOSTS: Readonly<Record<string, string>> = {
  'United States': 'api.xdr.trendmicro.com',
  Germany: 'api.eu.xdr.trendmicro.com',
  Singapore: 'api.sg.xdr.trendmicro.com',
  Japan: 'api.xdr.trendmicro.co.jp',
  Australia: 'api.au.xdr.trendmicro.com',
  India: 'api.in.xdr.trendmicro.com',
  'United Arab Emirates': 'api.mea.xdr.trendmicro.com',
  'United Kingdom': 'api.uk.xdr.trendmicro.com',
  Canada: 'api.ca.xdr.trendmicro.com',
  'South Africa': 'api.za.xdr.trendmicro.com',
  Indonesia: 'api.id.xdr.trendmicro.com',
};

export const API_PREFIX = '/v3.0';
export const REQUEST_TIMEOUT_MS = 60_000;

export const ENDPOINT_FILTER_MAX = 1024;
export const OAT_FILTER_MAX = 4000;
/** Largest page size of each list action; a caller nextLink may not ask for more. */
export const ENDPOINT_TOP_MAX = 200;
export const OAT_TOP_MAX = 100;
/** Characters above U+00FF are silently removed from an HTTP header by the HTTP client. */
export const ABOVE_LATIN1 = /[\u0100-\uffff]/;

/** Deprecated by the product: removed from every returned alert and never sent. */
export const DEPRECATED_ALERT_FIELD = 'investigationStatus';

export const ALERT_STATUSES = ['Open', 'In Progress', 'Closed'] as const;
export const INVESTIGATION_RESULTS = [
  'No Findings',
  'Noteworthy',
  'True Positive',
  'False Positive',
  'Benign True Positive',
  'Other Findings',
] as const;
export const ALERT_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export const DATE_TIME_TARGETS = [
  'createdDateTime',
  'updatedDateTime',
  'firstInvestigatedDateTime',
] as const;

export const OBJECT_TYPES = [
  'url',
  'domain',
  'ip',
  'fileSha1',
  'fileSha256',
  'senderMailAddress',
] as const;
export type ObjectType = (typeof OBJECT_TYPES)[number];

/** Per-type value limits from the product's suspicious object schemas. */
export const OBJECT_VALUE_MAX: Readonly<Record<ObjectType, number>> = {
  url: 2048,
  domain: 253,
  ip: 39,
  fileSha1: 40,
  fileSha256: 64,
  senderMailAddress: 320,
};

export const ENDPOINT_SELECT_FIELDS = [
  'endpointName',
  'osName',
  'type',
  'ipAddresses',
  'isolationStatus',
  'osPlatform',
  'osVersion',
  'osKernelVersion',
  'osArchitecture',
  'cpuArchitecture',
  'displayName',
  'agentGuid',
  'lastLoggedOnUser',
  'lastUsedIp',
  'serviceGatewayOrProxy',
  'serialNumber',
  'versionControlPolicy',
  'agentUpdatePolicy',
  'agentUpdateStatus',
  'creditAllocatedLicenses',
  'securityPolicy',
  'securityPolicyOverriddenStatus',
  'eppAgentComponentVersion',
  'eppAgentComponentUpdatePolicy',
  'eppAgentComponentUpdateStatus',
  'eppAgentKernelSupportPackageVersion',
  'eppAgentProtectionManager',
  'eppAgentProductNames',
  'eppAgentEndpointGroup',
  'eppAgentStatus',
  'eppAgentPolicyName',
  'eppAgentVersion',
  'eppAgentLastConnectedDateTime',
  'eppAgentLastScannedDateTime',
  'eppAgentInstalledComponentIds',
  'eppAgentPatterns',
  'edrSensorEndpointGroup',
  'edrSensorProductNames',
  'edrSensorVersion',
  'edrSensorComponentUpdatePolicy',
  'edrSensorComponentUpdateStatus',
  'edrSensorKernelSupportPackageVersion',
  'edrSensorConnectivity',
  'edrSensorLastConnectedDateTime',
  'edrSensorStatus',
  'edrSensorAdvancedRiskTelemetryStatus',
  'edrSensorPatterns',
  'eppAgentVirtualMachineDetailsCloudInstanceId',
  'eppAgentVirtualMachineDetailsCloudProvider',
  'eppAgentVirtualMachineDetailsCloudAccountId',
  'eppAgentVirtualMachineDetailsPowerState',
] as const;
