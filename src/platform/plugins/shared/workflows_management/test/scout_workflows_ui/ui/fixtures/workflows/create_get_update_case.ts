/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const createGetUpdateCase = `
name: Case CRUD
enabled: false
description: This is a workflow to test create/update/delete cases
triggers:
  - type: manual

inputs:
  - name: title
    type: string
  - name: description
    type: string
  - name: severity
    type: string

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
      owner: securitySolution
      settings:
        syncAlerts: false
      tags:
        - Example
  
  - name: wait
    type: wait
    with:
      duration: 7s
  
  - name: get_case
    type: kibana.getCase
    with:
      caseId: \${{steps.create_case.output.id}}
      includeComments: false

  - name: update_case
    type: kibana.updateCase
    with:
      cases:
        - id: \${{steps.get_case.output.id}}
          version: \${{steps.get_case.output.version}}
          title: 'Updated'
`;
