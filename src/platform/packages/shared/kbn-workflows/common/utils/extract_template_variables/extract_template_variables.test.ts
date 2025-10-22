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
        {{   user.getFullName   }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'user.profile.firstName',
      'order.items[0].name',
      'user.isAdmin',
      'user.getFullName',
    ]);
  });

  it('should return only input variables filtering local variables in foreach', () => {
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
    expect(variables).toEqual(['order.items', 'order.total']);
  });

  it('should handle RangeToken in for loops', () => {
    const template = `
      {% for i in (1..5) %}
        Item {{ i }}: {{ products[i] }}
      {% endfor %}
      {% for j in (start..end) %}
        {{ items[j] }}
      {% endfor %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['products', 'start', 'end', 'items']);
  });

  it('should handle LiteralToken (true, false, nil)', () => {
    const template = `
      {% if user.isActive == true %}
        Active user
      {% endif %}
      {% if product.stock == nil %}
        Out of stock
      {% endif %}
      {% assign isValid = false %}
      {{ user.permissions }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.isActive', 'product.stock', 'user.permissions']);
  });

  it('should handle QuotedToken (string literals)', () => {
    const template = `
      {% if user.role == "admin" %}
        {{ user.name }}
      {% endif %}
      {% assign greeting = 'Hello' %}
      {{ product.category }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.role', 'user.name', 'product.category']);
  });

  it('should handle NumberToken in comparisons and array access', () => {
    const template = `
      {% if user.age > 18 %}
        {{ user.name }}
      {% endif %}
      {{ items[0] }}
      {{ products[123] }}
      {% if price < 100.50 %}
        Affordable
      {% endif %}
      {{ cart.total }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'user.age',
      'user.name',
      'items[0]',
      'products[123]',
      'price',
      'cart.total',
    ]);
  });

  it('should handle complex expressions with multiple token types', () => {
    const template = `
      {% for i in (0..count) %}
        {% if items[i].price < 50 and items[i].inStock == true %}
          {{ items[i].name }} - {{ items[i].price }}
        {% endif %}
      {% endfor %}
      {{ user.name | default: "Guest" }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['count', 'items', 'user.name']);
  });

  it('should handle filters without extracting filter names as variables', () => {
    const template = `
      {{ user.name | upcase }}
      {{ product.price | minus: 10 | divided_by: 2 }}
      {{ date | date: "%Y-%m-%d" }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.name', 'product.price', 'date']);
  });

  it('should handle nested property access with array indices', () => {
    const template = `
      {{ user.orders[0].items[1].name }}
      {{ data.results[5].nested.value }}
      {{ array[0][1][2] }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'user.orders[0].items[1].name',
      'data.results[5].nested.value',
      'array[0][1][2]',
    ]);
  });
});
