/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowTemplatingEngine } from './templating_engine';

describe('WorkflowTemplatingEngine', () => {
  let templatingEngine: WorkflowTemplatingEngine;

  beforeEach(() => {
    templatingEngine = new WorkflowTemplatingEngine();
  });

  describe('object rendering', () => {
    it('should render object with string templates', () => {
      const obj = {
        message: 'Hello, {{user.name}}!',
        details: {
          age: '{{user.age}}',
          address: '{{user.address.street}}, {{user.address.city}}',
        },
        tags: ['{{user.tag1}}', '{{user.tag2}}'],
      };

      const context = {
        user: {
          name: 'Alice',
          age: 30,
          address: {
            street: '123 Main St',
            city: 'Wonderland',
          },
          tag1: 'admin',
          tag2: 'editor',
        },
      };

      const rendered = templatingEngine.render(obj, context);

      expect(rendered).toEqual({
        message: 'Hello, Alice!',
        details: {
          age: '30',
          address: '123 Main St, Wonderland',
        },
        tags: ['admin', 'editor'],
      });
    });

    it('should handle non-string values without modification', () => {
      const obj = {
        number: 42,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
        array: [1, 2, 3],
        nested: {
          value: 3.14,
        },
      };

      const context = {};

      const rendered = templatingEngine.render(obj, context);

      expect(rendered).toEqual(obj);
    });
  });

  it('should render simple string template', () => {
    const template = 'Welcome, {{user}}!';
    const context = { user: 'Bob' };

    const rendered = templatingEngine.render(template, context);

    expect(rendered).toBe('Welcome, Bob!');
  });
});
