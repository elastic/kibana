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

export const DATA_KNOWN_TYPES = ['logs', 'traces', 'metrics'] as const;

export type DataTelemetryType = typeof DATA_KNOWN_TYPES[number];

export type DataPatternName = typeof DATA_DATASETS_INDEX_PATTERNS[number]['patternName'];

// TODO: Ideally this list should be updated from an external public URL (similar to the newsfeed)
// But it's good to have a minimum list shipped with the build.
export const DATA_DATASETS_INDEX_PATTERNS = [
  // Security - Elastic
  { pattern: 'auditbeat-*', patternName: 'auditbeat' },
  { pattern: 'winlogbeat-*', patternName: 'winlogbeat' },
  { pattern: 'packetbeat-*', patternName: 'packetbeat' },
  // Security - 3rd party
  { pattern: '*tomcat*', patternName: 'tomcat' },
  { pattern: '*apache*', patternName: 'apache' }, // Already in Observability (keeping it in here for documentation)
  { pattern: '*artifactory*', patternName: 'artifactory' },
  { pattern: '*aruba*', patternName: 'aruba' },
  { pattern: '*barracuda*', patternName: 'barracuda' },
  { pattern: '*cef*', patternName: 'cef' },
  { pattern: '*checkpoint*', patternName: 'checkpoint' },
  { pattern: '*cisco*', patternName: 'cisco' },
  { pattern: '*citrix*', patternName: 'citrix' },
  { pattern: '*cyberark*', patternName: 'cyberark' },
  { pattern: '*cylance*', patternName: 'cylance' },
  { pattern: '*fortinet*', patternName: 'fortinet' },
  { pattern: '*infoblox*', patternName: 'infoblox' },
  { pattern: '*kaspersky*', patternName: 'kaspersky' },
  { pattern: '*mcafee*', patternName: 'mcafee' },
  { pattern: '*paloaltonetworks*', patternName: 'paloaltonetworks' },
  { pattern: '*pan*', patternName: 'paloaltonetworks' },
  { pattern: '*rsa*', patternName: 'rsa' },
  { pattern: '*snort*', patternName: 'snort' },
  { pattern: '*sonicwall*', patternName: 'sonicwall' },
  { pattern: '*sophos*', patternName: 'sophos' },
  { pattern: '*squid*', patternName: 'squid' },
  { pattern: '*symantec*', patternName: 'symantec' },
  { pattern: '*tippingpoint*', patternName: 'tippingpoint' },
  { pattern: '*trendmicro*', patternName: 'trendmicro' },
  { pattern: '*tripwire*', patternName: 'tripwire' },
  { pattern: '*zscaler*', patternName: 'zscaler' },
  { pattern: '*zeek*', patternName: 'zeek' },
  { pattern: '*sigma_doc*', patternName: 'sigma_doc' },
  { pattern: '*bro*', patternName: 'bro' },
  { pattern: '*suricata*', patternName: 'suricata' },
  { pattern: '*fsf*', patternName: 'fsf' },
  { pattern: '*wazuh*', patternName: 'wazuh' },

  // Enterprise Search - Elastic
  { pattern: '.ent-search-*', patternName: 'enterprise-search' },
  { pattern: '.app-search-*', patternName: 'app-search' },
  // Enterprise Search - 3rd party
  { pattern: '*magento2*', patternName: 'magento2' },
  { pattern: '*magento*', patternName: 'magento' },
  { pattern: '*shopify*', patternName: 'shopify' },
  { pattern: '*wordpress*', patternName: 'wordpress' },
  { pattern: '*wp*', patternName: 'wordpress' },
  { pattern: '*drupal*', patternName: 'drupal' },
  { pattern: '*joomla*', patternName: 'joomla' },
  { pattern: '*search*', patternName: 'search' },
  { pattern: '*wix*', patternName: 'wix' },
  { pattern: '*sharepoint*', patternName: 'sharepoint' },
  { pattern: '*squarespace*', patternName: 'squarespace' },
  { pattern: '*aem*', patternName: 'aem' },
  { pattern: '*sitecore*', patternName: 'sitecore' },
  { pattern: '*weebly*', patternName: 'weebly' },
  { pattern: '*acquia*', patternName: 'acquia' },

  // Observability - Elastic
  { pattern: 'filebeat-*', patternName: 'filebeat' },
  { pattern: 'metricbeat-*', patternName: 'metricbeat' },
  { pattern: 'apm-*', patternName: 'apm' },
  { pattern: 'functionbeat-*', patternName: 'functionbeat' },
  { pattern: 'heartbeat-*', patternName: 'heartbeat' },
  // Observability - 3rd party
  { pattern: 'fluentd*', patternName: 'fluentd' },
  { pattern: 'telegraf*', patternName: 'telegraf' },
  { pattern: 'prometheusbeat*', patternName: 'prometheusbeat' },
  { pattern: 'fluentbit*', patternName: 'fluentbit' },
  { pattern: '*nginx*', patternName: 'nginx' },
  { pattern: '*apache*', patternName: 'apache' }, // Already in Security (keeping it in here for documentation)
  { pattern: '*logs*', patternName: 'third-party-logs' },
] as const;
