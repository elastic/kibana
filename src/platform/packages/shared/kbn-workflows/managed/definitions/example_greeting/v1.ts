/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExampleManagedWorkflowTemplateValues } from './types';

export const yamlTemplate = ({ recipient }: ExampleManagedWorkflowTemplateValues) =>
  `name: Example Greeting - ${recipient}
enabled: true
triggers:
  - type: manual
steps:
  - name: greet
    type: console
    with:
      message: "Hello, ${recipient}! This is a managed workflow example."
`;
