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
// These sample steps are used to test validation in generateYamlSchemaFromConnectors.kibana.test.ts and getWorkflowJsonSchema.kibana.test.ts
export const KIBANA_VALID_SAMPLE_STEPS = [
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
  {
    name: 'get_case',
    type: 'kibana.getCase',
    with: {
      caseId: '123',
      includeComments: true,
    },
  },
  {
    name: 'add_case_comment_alert',
    type: 'kibana.addCaseComment',
    with: {
      caseId: '123',
      alertId: 'alert-123',
      index: '.alerts-security.alerts-default',
      owner: 'securitySolution',
      rule: {
        id: 'rule-123',
        name: 'Test Rule',
      },
      type: 'alert',
    },
  },
  {
    name: 'add_case_comment_user',
    type: 'kibana.addCaseComment',
    with: {
      caseId: '123',
      comment: 'This is a user comment on the case',
      owner: 'securitySolution',
      type: 'user',
    },
  },
];

export const KIBANA_INVALID_SAMPLE_STEPS = [
  {
    step: {
      name: 'set_alerts_status_by_ids_without_signal_ids',
      type: 'kibana.SetAlertsStatus',
      with: {
        status: 'closed',
      },
    },
    zodErrorMessage: 'Invalid input: expected array, received undefined',
    diagnosticErrorMessage: /Missing property "signal_ids"/,
  },
  {
    step: {
      name: 'set_alert_tags_without_ids',
      type: 'kibana.SetAlertTags',
      with: {
        tags: {
          tags_to_add: ['123'],
          tags_to_remove: [],
        },
      },
    },
    zodErrorMessage: 'Invalid input: expected array, received undefined',
    diagnosticErrorMessage: /Missing property "ids"/,
  },
  {
    step: {
      name: 'create_case_without_description',
      type: 'kibana.createCase',
      with: {
        owner: 'securitySolution',
        title: '[Attack Discovery] {{foreach.item.attack_discovery.title_with_replacements}}',
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
    zodErrorMessage: 'Invalid input: expected string, received undefined',
    diagnosticErrorMessage: /Missing property "description"/,
  },
  {
    step: {
      name: 'update_case_without_cases',
      type: 'kibana.updateCase',
      with: {},
    },
    zodErrorMessage: 'Invalid input: expected array, received undefined',
    diagnosticErrorMessage: /Missing property "cases"/,
  },
  {
    step: {
      name: 'get_case_without_case_id',
      type: 'kibana.getCase',
      with: {
        includeComments: true,
      },
    },
    zodErrorMessage: 'Invalid input: expected string, received undefined',
    diagnosticErrorMessage: /Missing property "caseId"/,
  },
  {
    step: {
      name: 'add_case_comment_without_type',
      type: 'kibana.addCaseComment',
      with: {
        caseId: '123',
        comment: 'This is a comment',
        owner: 'securitySolution',
      },
    },
    zodErrorMessage: /expected \\"alert\\"[\s\S]*expected \\"user\\"/,
    diagnosticErrorMessage: /type/,
  },
];
