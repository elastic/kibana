/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const workflowDefaultYaml = `name: New workflow
enabled: false
description: This is a new workflow
tags:
  - workflow
  - example
triggers:
  - type: manual

# Inputs allow you to provide values when running the workflow
inputs:
  - name: people
    type: array
    default:
      - alice
      - bob
      - charlie
    description: List of people to greet
  - name: greeting
    type: string
    default: Hello
    description: The greeting message to use

# Constants are reusable values defined once
consts:
  favorite_person: bob
  api_endpoint: https://api.example.com

steps:
  # Foreach loops iterate over arrays
  - name: iterate_people
    type: foreach
    foreach: "{{ inputs.people }}"
    steps:
      # Access foreach context: foreach.item, foreach.index
      - name: log_current_person
        type: console
        with:
          message: |
            Processing: {{ foreach.item }}
            Index: {{ foreach.index }}

      # If conditions allow conditional execution (uses KQL syntax)
      - name: check_if_favorite
        type: if
        condition: "foreach.item: {{ consts.favorite_person }}"
        steps:
          - name: greet_favorite
            type: console
            with:
              # Templates support data transformation, like 'upcase' or 'capitalize'
              message: "{{ inputs.greeting }}, {{ foreach.item | upcase }}! You're special! ❤️"
        else:
          - name: greet_normal
            type: console
            with:
              message: "{{ inputs.greeting }}, {{ foreach.item | capitalize }}!"

      # Example of accessing previous step output
      - name: use_step_output
        type: console
        with:
          message: |
            Previous step logged: {{ steps.log_current_person.output }}
            Using const: {{ consts.api_endpoint }}

      # Example of using filters (json filter formats data as JSON string)
      - name: demonstrate_filters
        type: console
        with:
          message: "People array as JSON: {{ inputs.people | json }}"
`;
