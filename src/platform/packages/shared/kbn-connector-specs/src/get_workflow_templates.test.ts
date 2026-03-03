/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWorkflowTemplatesForConnector } from './get_workflow_templates';

describe('getWorkflowTemplatesForConnector', () => {
  it('returns empty array for unknown connector type', () => {
    expect(getWorkflowTemplatesForConnector('.nonexistent')).toEqual([]);
  });

  it('returns empty array for connector without agentBuilderWorkflows', () => {
    expect(getWorkflowTemplatesForConnector('.github')).toEqual([]);
  });

  it('returns workflow YAML strings for .slack2', () => {
    const templates = getWorkflowTemplatesForConnector('.slack2');
    expect(templates.length).toBeGreaterThan(0);
    for (const yaml of templates) {
      expect(typeof yaml).toBe('string');
      expect(yaml).toContain('version:');
    }
  });

  it('returns YAML with template placeholders intact', () => {
    const templates = getWorkflowTemplatesForConnector('.slack2');
    const hasPlaceholder = templates.some((yaml) => yaml.includes('<%='));
    expect(hasPlaceholder).toBe(true);
  });
});
