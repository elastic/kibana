/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const DATA_TELEMETRY_ID = 'data';

export const DATA_KNOWN_TYPES = ['logs', 'traces', 'metrics'] as const;

export type DataTelemetryType = typeof DATA_KNOWN_TYPES[number];

export type DataPatternName = typeof DATA_DATASETS_INDEX_PATTERNS[number]['patternName'];

// TODO: Ideally this list should be updated from an external public URL (similar to the newsfeed)
// But it's good to have a minimum list shipped with the build.
export const DATA_DATASETS_INDEX_PATTERNS = [
  // Enterprise Search - Elastic
  { pattern: '.ent-search-*', patternName: 'enterprise-search' },
  { pattern: '.app-search-*', patternName: 'app-search' },
  // Enterprise Search - 3rd party
  { pattern: '*magento2*', patternName: 'magento2' },
  { pattern: '*magento*', patternName: 'magento' },
  { pattern: '*shopify*', patternName: 'shopify' },
  { pattern: '*wordpress*', patternName: 'wordpress' },
  // { pattern: '*wp*', patternName: 'wordpress' }, // TODO: Too vague?
  { pattern: '*drupal*', patternName: 'drupal' },
  { pattern: '*joomla*', patternName: 'joomla' },
  { pattern: '*search*', patternName: 'search' }, // TODO: Too vague?
  // { pattern: '*wix*', patternName: 'wix' }, // TODO: Too vague?
  { pattern: '*sharepoint*', patternName: 'sharepoint' },
  { pattern: '*squarespace*', patternName: 'squarespace' },
  // { pattern: '*aem*', patternName: 'aem' }, // TODO: Too vague?
  { pattern: '*sitecore*', patternName: 'sitecore' },
  { pattern: '*weebly*', patternName: 'weebly' },
  { pattern: '*acquia*', patternName: 'acquia' },

  // Observability - Elastic
  { pattern: 'filebeat-*', patternName: 'filebeat', shipper: 'filebeat' },
  { pattern: 'metricbeat-*', patternName: 'metricbeat', shipper: 'metricbeat' },
  { pattern: 'apm-*', patternName: 'apm', shipper: 'apm' },
  { pattern: 'functionbeat-*', patternName: 'functionbeat', shipper: 'functionbeat' },
  { pattern: 'heartbeat-*', patternName: 'heartbeat', shipper: 'heartbeat' },
  { pattern: 'logstash-*', patternName: 'logstash', shipper: 'logstash' },
  // Observability - 3rd party
  { pattern: 'fluentd*', patternName: 'fluentd' },
  { pattern: 'telegraf*', patternName: 'telegraf' },
  { pattern: 'prometheusbeat*', patternName: 'prometheusbeat' },
  { pattern: 'fluentbit*', patternName: 'fluentbit' },
  { pattern: '*nginx*', patternName: 'nginx' },
  { pattern: '*apache*', patternName: 'apache' }, // Already in Security (keeping it in here for documentation)
  // { pattern: '*logs*', patternName: 'third-party-logs' }, Disabled for now

  // Security - Elastic
  { pattern: 'logstash-*', patternName: 'logstash', shipper: 'logstash' },
  { pattern: 'endgame-*', patternName: 'endgame', shipper: 'endgame' },
  { pattern: 'logs-endpoint.*', patternName: 'logs-endpoint', shipper: 'endpoint' }, // It should be caught by the `mappings` logic, but just in case
  { pattern: 'metrics-endpoint.*', patternName: 'metrics-endpoint', shipper: 'endpoint' }, // It should be caught by the `mappings` logic, but just in case
  { pattern: '.siem-signals-*', patternName: 'siem-signals' },
  { pattern: 'auditbeat-*', patternName: 'auditbeat', shipper: 'auditbeat' },
  { pattern: 'winlogbeat-*', patternName: 'winlogbeat', shipper: 'winlogbeat' },
  { pattern: 'packetbeat-*', patternName: 'packetbeat', shipper: 'packetbeat' },
  { pattern: 'filebeat-*', patternName: 'filebeat', shipper: 'filebeat' },
  // Security - 3rd party
  { pattern: '*apache*', patternName: 'apache' }, // Already in Observability (keeping it in here for documentation)
  { pattern: '*tomcat*', patternName: 'tomcat' },
  { pattern: '*artifactory*', patternName: 'artifactory' },
  { pattern: '*aruba*', patternName: 'aruba' },
  { pattern: '*barracuda*', patternName: 'barracuda' },
  { pattern: '*bluecoat*', patternName: 'bluecoat' },
  { pattern: 'arcsight-*', patternName: 'arcsight', shipper: 'arcsight' },
  // { pattern: '*cef*', patternName: 'cef' }, // Disabled because it's too vague
  { pattern: '*checkpoint*', patternName: 'checkpoint' },
  { pattern: '*cisco*', patternName: 'cisco' },
  { pattern: '*citrix*', patternName: 'citrix' },
  { pattern: '*cyberark*', patternName: 'cyberark' },
  { pattern: '*cylance*', patternName: 'cylance' },
  { pattern: '*fireeye*', patternName: 'fireeye' },
  { pattern: '*fortinet*', patternName: 'fortinet' },
  { pattern: '*infoblox*', patternName: 'infoblox' },
  { pattern: '*kaspersky*', patternName: 'kaspersky' },
  { pattern: '*mcafee*', patternName: 'mcafee' },
  // paloaltonetworks
  { pattern: '*paloaltonetworks*', patternName: 'paloaltonetworks' },
  { pattern: 'pan-*', patternName: 'paloaltonetworks' },
  { pattern: 'pan_*', patternName: 'paloaltonetworks' },
  { pattern: 'pan.*', patternName: 'paloaltonetworks' },

  // rsa
  { pattern: 'rsa.*', patternName: 'rsa' },
  { pattern: 'rsa-*', patternName: 'rsa' },
  { pattern: 'rsa_*', patternName: 'rsa' },

  // snort
  { pattern: 'snort-*', patternName: 'snort' },
  { pattern: 'logstash-snort*', patternName: 'snort' },

  { pattern: '*sonicwall*', patternName: 'sonicwall' },
  { pattern: '*sophos*', patternName: 'sophos' },

  // squid
  { pattern: 'squid-*', patternName: 'squid' },
  { pattern: 'squid_*', patternName: 'squid' },
  { pattern: 'squid.*', patternName: 'squid' },

  { pattern: '*symantec*', patternName: 'symantec' },
  { pattern: '*tippingpoint*', patternName: 'tippingpoint' },
  { pattern: '*trendmicro*', patternName: 'trendmicro' },
  { pattern: '*tripwire*', patternName: 'tripwire' },
  { pattern: '*zscaler*', patternName: 'zscaler' },
  { pattern: '*zeek*', patternName: 'zeek' },
  { pattern: '*sigma_doc*', patternName: 'sigma_doc' },
  // { pattern: '*bro*', patternName: 'bro' }, // Disabled because it's too vague
  { pattern: 'ecs-corelight*', patternName: 'ecs-corelight' },
  { pattern: '*suricata*', patternName: 'suricata' },
  // { pattern: '*fsf*', patternName: 'fsf' }, // Disabled because it's too vague
  { pattern: '*wazuh*', patternName: 'wazuh' },

  // meow attacks
  { pattern: '*meow*', patternName: 'meow' },

  // experimental ml
  { pattern: 'ml_host_risk_score_latest_*', patternName: 'host_risk_score' },
] as const;

// Get the unique list of index patterns (some are duplicated for documentation purposes)
export const DATA_DATASETS_INDEX_PATTERNS_UNIQUE = DATA_DATASETS_INDEX_PATTERNS.filter(
  (entry, index, array) => !array.slice(0, index).find(({ pattern }) => entry.pattern === pattern)
);
