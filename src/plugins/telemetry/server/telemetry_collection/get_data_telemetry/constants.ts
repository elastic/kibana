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

export const DATA_TELEMETRY_ID = 'data';

export const DATA_KNOWN_TYPES = ['logs', 'events', 'metrics'] as const;

export type DataTelemetryType = typeof DATA_KNOWN_TYPES[number];

export interface DataDatasetsIndexPatterns {
  pattern: string;
  datasetName: string;
  // The ones below are only to categorise any known patterns
  datasetType?: DataTelemetryType;
  shipper?: string;
}

// TODO: Ideally this list should be updated from an external public URL (similar to the newsfeed)
// But it's good to have a minimum list shipped with the build.
export const DATA_DATASETS_INDEX_PATTERNS: Readonly<DataDatasetsIndexPatterns[]> = [
  // Security - Elastic
  { pattern: 'auditbeat-*', datasetName: 'auditbeat' },
  { pattern: 'winlogbeat-*', datasetName: 'winlogbeat' },
  { pattern: 'packetbeat-*', datasetName: 'packetbeat' },
  // Security - 3rd party
  // TODO: Add/modify/remove entries once the security team confirms them
  { pattern: '*tomcat*', datasetName: 'tomcat' },
  { pattern: '*apache*', datasetName: 'apache' }, // Already in Observability (keeping it in here for documentation)
  { pattern: '*artifactory*', datasetName: 'artifactory' },
  { pattern: '*arubanetworks*', datasetName: 'arubanetworks' },
  { pattern: 'barracuda*', datasetName: 'barracuda' },
  { pattern: 'checkpoint*', datasetName: 'checkpoint' },
  { pattern: 'cisco*', datasetName: 'cisco' },
  { pattern: 'citrix*', datasetName: 'citrix' },
  { pattern: 'cyberark*', datasetName: 'cyberark' },
  { pattern: 'cylance*', datasetName: 'cylance' },
  { pattern: '*dellswitch*', datasetName: 'dellswitch' },
  // { pattern: '*devices/rhlinux*', datasetName: 'devices/rhlinux' }, // Pending to confirm
  { pattern: '*emc*', datasetName: 'emc' },
  { pattern: 'fortinet*', datasetName: 'fortinet' },
  { pattern: 'mcafee*', datasetName: 'mcafee' },
  { pattern: '*microsoft*', datasetName: 'microsoft' },
  { pattern: 'paloaltonetworks*', datasetName: 'paloaltonetworks' },
  { pattern: 'pan*', datasetName: 'paloaltonetworks' },
  { pattern: 'symantec*', datasetName: 'symantec' },
  { pattern: 'trendmicro*', datasetName: 'trendmicro' },
  { pattern: 'tripwire*', datasetName: 'tripwire' },
  { pattern: '*vmware*', datasetName: 'vmware' },

  // Enterprise Search - Elastic
  { pattern: '.ent-search-*', datasetName: 'enterprise-search' },
  { pattern: '.app-search-*', datasetName: 'app-search' },
  // Enterprise Search - 3rd party
  { pattern: '*magento2*', datasetName: 'magento2' },
  { pattern: '*magento*', datasetName: 'magento' },
  { pattern: '*shopify*', datasetName: 'shopify' },
  { pattern: '*wordpress*', datasetName: 'wordpress' },
  { pattern: '*wp*', datasetName: 'wp' },
  { pattern: '*drupal*', datasetName: 'drupal' },
  { pattern: '*joomla*', datasetName: 'joomla' },
  { pattern: '*search*', datasetName: 'search' },
  { pattern: '*wix*', datasetName: 'wix' },
  { pattern: '*sharepoint*', datasetName: 'sharepoint' },
  { pattern: '*squarespace*', datasetName: 'squarespace' },
  { pattern: '*aem*', datasetName: 'aem' },
  { pattern: '*sitecore*', datasetName: 'sitecore' },
  { pattern: '*weebly*', datasetName: 'weebly' },
  { pattern: '*acquia*', datasetName: 'acquia' },

  // Observability - Elastic
  { pattern: 'filebeat-*', datasetName: 'filebeat' },
  { pattern: 'metricbeat-*', datasetName: 'metricbeat' },
  { pattern: 'apm-*', datasetName: 'apm' },
  { pattern: 'functionbeat-*', datasetName: 'functionbeat' },
  { pattern: 'heartbeat-*', datasetName: 'heartbeat' },
  // Observability - 3rd party
  { pattern: 'fluentd*', datasetName: 'fluentd' },
  { pattern: 'telegraf*', datasetName: 'telegraf' },
  { pattern: 'prometheusbeat*', datasetName: 'prometheusbeat' },
  { pattern: 'fluentbit*', datasetName: 'fluentbit' },
  { pattern: '*nginx*', datasetName: 'nginx' },
  { pattern: '*apache*', datasetName: 'apache' }, // Already in Security (keeping it in here for documentation)
  { pattern: '*logs*', datasetName: 'third-party-logs', datasetType: 'logs' },
] as const;

/**
 * If we only retrieve the shipper, what datasetType should we assume for them?
 * This mapping allows us to define it.
 */
export const DATA_SHIPPER_TO_TYPE_MAPPING: { [key: string]: DataTelemetryType } = {
  filebeat: 'logs',
  metricbeat: 'metrics',
  apm: 'events',
  functionbeat: 'events',
  heartbeat: 'metrics',
  auditbeat: 'events',
  winlogbeat: 'logs',
  packetbeat: 'events',
};
