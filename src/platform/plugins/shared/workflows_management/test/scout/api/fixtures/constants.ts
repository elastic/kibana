/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'true',
};

export const SIMPLE_WORKFLOW_YAML = `name: ImportTest Workflow
description: A simple test workflow for import
enabled: false
triggers:
  - type: manual
steps:
  - type: console
    name: Step 1
    with:
      message: hello
`;
