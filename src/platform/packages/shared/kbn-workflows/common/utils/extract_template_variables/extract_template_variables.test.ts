/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractTemplateVariables } from './extract_template_variables';

describe('extractTemplateVariables', () => {
  it('should extract variables from a Nunjucks template string', () => {
    const template = `
      Hello {{ user.name }}!
      Your order {{ order.id }} is confirmed.
      {% if user.isMember %}
        Thank you for being a member!
      {% endif %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.name', 'order.id', 'user.isMember']);
  });

  it('should return an empty array if no variables are found', () => {
    const template = `
      Hello World!
      This is a static template.
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([]);
  });

  it('should handle nested variables and different whitespace', () => {
    const template = `
      {{   user.profile.firstName   }}
      {{order.items[0].name}}
      {% if   user.isAdmin %}
        Admin Panel Access  {% endif %}
        {{   user.getFullName()   }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'user.profile.firstName',
      'order.items[0].name',
      'user.isAdmin',
      'user.getFullName()',
    ]);
  });

  it('should handle complex templates with loops and conditions', () => {
    const template = `
      {% for item in order.items %}
        {{ item.name }} - {{ item.price }}
        {% if item.onSale %}
          (On Sale!)
        {% endif %}
      {% endfor %}
      Total: {{ order.total }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'order.items',
      'item.name',
      'item.price',
      'item.onSale',
      'order.total',
    ]);
  });
});
