/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const getCreateGetUpdateCaseWorkflowYaml = (owner: string) => `
name: Case E2E test
enabled: false
description: This is a workflow to test case kibana E2E
triggers:
  - type: manual

inputs:
  type: object
  title: Alert
  description: Alert metadata with severity level and comments

  properties:
    title:
      type: string
      description: Short human-readable title

    description:
      type: string
      description: Detailed description of the alert

    severity:
      type: string
      description: Severity level of the alert
      enum:
        - low
        - medium
        - high
        - critical

    comments:
      type: array
      description: List of comments associated with the alert
      items:
        type: object
        properties:
          type:
            type: string
            enum:
              - user
            description: Comment category

          comment:
            type: string
            description: Comment text

        required:
          - type
          - comment
        additionalProperties: false

  required:
    - title
    - description
    - severity

  additionalProperties: false

steps:
  - name: create_case
    type: kibana.createCaseDefaultSpace
    with:
      title: "{{ inputs.title }}"
      description: "{{ inputs.description }}"
      severity: low
      connector:
        fields: null
        id: none
        name: none
        type: .none
      owner: "${owner}"
      settings:
        syncAlerts: false
      tags:
        - Example
  - name: set_version
    type: data.set
    with:
      case_id: \${{steps.create_case.output.id}}
      case_version: \${{steps.create_case.output.version}}
  
  - name: wait
    type: wait
    with:
      duration: 7s
  
  - name: loop_through_comments
    type: foreach
    foreach: \${{inputs.comments}}
    steps:
      - name: create_case_comment
        type: kibana.addCaseComment
        with:
          caseId: \${{variables.case_id}}
          comment: \${{foreach.item.comment}}
          type: user
          owner: "${owner}"

      - name: set_new_version
        type: data.set
        with:
          case_version: \${{steps.create_case_comment.output.version}}

  - name: update_case
    type: kibana.updateCase
    with:
      cases:
        - id: \${{variables.case_id}}
          version: \${{variables.case_version}}
          title: 'Updated: {{inputs.title}}'
          description: 'Updated: {{inputs.description}}'

  - name: get_case
    type: kibana.getCase
    with:
      caseId: \${{variables.case_id}}
      includeComments: false
`;
