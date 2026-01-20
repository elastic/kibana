/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// kibana
// Alert Triage:
// * Update alert status (operationId: SetAlertsStatus)
// * Assign ownership (operationId: SetAlertAssignees)
// * Apply tags (operationId: SetAlertTags)
// * Read tags (operationId: ReadTags)
// Case Management:
// * Create case (operationId: createCaseDefaultSpace -> type: kibana.createCase)
// * Update case (operationId: updateCaseDefaultSpace -> type: kibana.updateCase)
export const KIBANA_SAMPLE_STEPS = [
  {
    name: 'set_alerts_status_by_ids',
    type: 'kibana.SetAlertsStatus',
    with: {
      status: 'closed',
      signal_ids: ['123'],
    },
  },
  {
    name: 'set_alerts_status_by_query',
    type: 'kibana.SetAlertsStatus',
    with: {
      status: 'closed',
      query: {
        match: {
          'kibana.alert.uuid': '123',
        },
      },
    },
  },
  // NOTE: kibana.SetAlertAssignees is not currently available in generated connectors
  // {
  //   name: 'set_alert_assignees_by_ids',
  //   type: 'kibana.SetAlertAssignees',
  //   with: {
  //     assignees: {
  //       add: ['123'],
  //       remove: [],
  //     },
  //     ids: ['123'],
  //   },
  // },
  {
    name: 'set_alert_tags',
    type: 'kibana.SetAlertTags',
    with: {
      tags: {
        tags_to_add: ['123'],
        tags_to_remove: [],
      },
      ids: ['123'],
    },
  },
  // NOTE: kibana.ReadTags is not currently available in generated connectors
  // {
  //   name: 'read_tags',
  //   type: 'kibana.ReadTags',
  //   with: {},
  // },
  {
    name: 'create_case',
    type: 'kibana.createCase',
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
  {
    name: 'update_case',
    type: 'kibana.updateCase',
    with: {
      cases: [
        {
          id: '123',
          version: '123',
          description: 'New Description',
        },
      ],
    },
  },
];
