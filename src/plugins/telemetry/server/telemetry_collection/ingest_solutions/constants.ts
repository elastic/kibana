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

export const INGEST_SOLUTIONS_ID = 'ingest_solutions';

// TODO: Ideally this list should be updated from an external public URL (similar to the newsfeed)
// But it's good to have a minimum list shipped with the build.
export const INGEST_SOLUTIONS = [
  // Security - Elastic
  { name: 'auditbeat', pattern: 'auditbeat-*' },
  { name: 'winlogbeat', pattern: 'winlogbeat-*' },
  { name: 'packetbeat', pattern: 'packetbeat-*' },
  // Security - 3rd party
  // TODO: Add/modify/remove entries once the security team confirms them
  { name: 'tomcat', pattern: '*tomcat*' },
  { name: 'apache', pattern: '*apache*' }, // Already in Observability (keeping it in here for documentation)
  { name: 'artifactory', pattern: '*artifactory*' },
  { name: 'arubanetworks', pattern: '*arubanetworks*' },
  { name: 'barracuda', pattern: 'barracuda*' },
  { name: 'checkpoint', pattern: 'checkpoint*' },
  { name: 'cisco', pattern: 'cisco*' },
  { name: 'citrix', pattern: 'citrix*' },
  { name: 'cyberark', pattern: 'cyberark*' },
  { name: 'cylance', pattern: 'cylance*' },
  { name: 'dellswitch', pattern: '*dellswitch*' },
  // { name: 'devices/rhlinux', pattern: '*devices/rhlinux*' }, // Pending to confirm
  { name: 'emc', pattern: '*emc*' },
  { name: 'fortinet', pattern: 'fortinet*' },
  { name: 'mcafee', pattern: 'mcafee*' },
  { name: 'microsoft', pattern: '*microsoft*' },
  { name: 'paloaltonetworks', pattern: 'paloaltonetworks*' },
  { name: 'paloaltonetworks', pattern: 'pan*' },
  { name: 'symantec', pattern: 'symantec*' },
  { name: 'trendmicro', pattern: 'trendmicro*' },
  { name: 'tripwire', pattern: 'tripwire*' },
  { name: 'vmware', pattern: '*vmware*' },

  // Enterprise Search - Elastic
  { name: 'enterprise-search', pattern: '.ent-search-*' },
  { name: 'app-search', pattern: '.app-search-*' },
  // Enterprise Search - 3rd party
  { name: 'magento2', pattern: '*magento2*' },
  { name: 'magento', pattern: '*magento*' },
  { name: 'shopify', pattern: '*shopify*' },
  { name: 'wordpress', pattern: '*wordpress*' },
  { name: 'wp', pattern: '*wp*' },
  { name: 'drupal', pattern: '*drupal*' },
  { name: 'joomla', pattern: '*joomla*' },
  { name: 'search', pattern: '*search*' },
  { name: 'wix', pattern: '*wix*' },
  { name: 'sharepoint', pattern: '*sharepoint*' },
  { name: 'squarespace', pattern: '*squarespace*' },
  { name: 'aem', pattern: '*aem*' },
  { name: 'sitecore', pattern: '*sitecore*' },
  { name: 'weebly', pattern: '*weebly*' },
  { name: 'acquia', pattern: '*acquia*' },

  // Observability - Elastic
  { name: 'filebeat', pattern: 'filebeat-*' },
  { name: 'metricbeat', pattern: 'metricbeat-*' },
  { name: 'apm', pattern: 'apm-*' },
  { name: 'functionbeat', pattern: 'functionbeat-*' },
  { name: 'heartbeat', pattern: 'heartbeat-*' },
  // Observability - 3rd party
  { name: 'fluentd', pattern: 'fluentd*' },
  { name: 'telegraf', pattern: 'telegraf*' },
  { name: 'prometheusbeat', pattern: 'prometheusbeat*' },
  { name: 'fluentbit', pattern: 'fluentbit*' },
  { name: 'nginx', pattern: '*nginx*' },
  { name: 'apache', pattern: '*apache*' }, // Already in Security (keeping it in here for documentation)
  { name: 'logs', pattern: '*logs*' },
] as const;
