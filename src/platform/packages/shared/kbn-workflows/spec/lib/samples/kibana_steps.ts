/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const KIBANA_SAMPLE_STEPS = [
  {
    name: 'create_case',
    type: 'kibana.createCaseDefaultSpace',
    with: {
      owner: 'securitySolution',
      title: '[Attack Discovery] {{foreach.item.attack_discovery.title_with_replacements}}',
      description:
        '## Attack Summary\n{{foreach.item.attack_discovery.summary_markdown_with_replacements}}\n## Detailed Analysis\n{{foreach.item.attack_discovery.details_markdown_with_replacements}}\n## Affected Entities\n{{foreach.item.attack_discovery.entity_summary_markdown_with_replacements}}\n## Investigation Context\n- **Discovery ID:** {{foreach.item.uuid}}\n- **Detection Time:** {{foreach.item.start}}\n- **Alert Count:** {{foreach.item.attack_discovery.alerts_context_count}}\n- **Risk Score:** {{foreach.item.alert.risk_score}}\n- **Rule:** {{foreach.item.rule.name}}\n\n## View Full Discovery\n\n{{foreach.item.url}}\n',
      tags: ['{{foreach.item.attack_discovery.mitre_attack_tactics}}'],
      settings: {
        syncAlerts: false,
      },
      severity: 'high',
      connector: {
        id: 'none',
        name: 'none',
        type: '.none',
        fields: null,
      },
    },
  },
];
