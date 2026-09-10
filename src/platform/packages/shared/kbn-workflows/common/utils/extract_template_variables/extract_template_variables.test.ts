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
    expect(variables).toEqual(['user.name', 'user.isMember', 'order.id']);
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
      'user.isAdmin',
      'user.getFullName',
      'order.items[0].name',
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
    expect(variables).toEqual(['user.isActive', 'user.permissions', 'product.stock']);
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

  it('should handle local assigned variables within for loops', () => {
    const template = `
      {% for item in products %}
        {% assign discountedPrice = item.price | minus: 10 %}
        {{ item.name }}: {{ discountedPrice }}
        {% if discountedPrice < threshold %}
          On sale!
        {% endif %}
      {% endfor %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['products', 'threshold']);
  });

  it('should handle user age assignment and comparison', () => {
    const template = `
      {% for item in products %}
        {% assign userAge = user.age %}
        {{ item.name }}: {{ userAge }}
        {% if userAge < threshold %}
          On sale!
        {% endif %}
      {% endfor %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['products', 'user.age', 'threshold']);
  });

  it('should handle unless tag (inverse of if)', () => {
    const template = `
      {% unless user.isPremium %}
        {{ upgrade.message }}
      {% endunless %}
      {{ user.name }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.isPremium', 'user.name', 'upgrade.message']);
  });

  it('should handle case/when statements', () => {
    const template = `
      {% case product.type %}
        {% when "electronics" %}
          {{ product.warranty }}
        {% when "clothing" %}
          {{ product.size }}
        {% else %}
          {{ product.description }}
      {% endcase %}
      {{ product.price }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'product.type',
      'product.warranty',
      'product.size',
      'product.description',
      'product.price',
    ]);
  });

  it('should handle elsif statements', () => {
    const template = `
      {% if user.age < 18 %}
        Minor
      {% elsif user.age < 65 %}
        {{ user.benefits }}
      {% else %}
        {{ senior.discount }}
      {% endif %}
      {{ user.name }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.age', 'user.benefits', 'user.name', 'senior.discount']);
  });

  it('should handle capture tag', () => {
    const template = `
      {% capture fullName %}
        {{ user.firstName }} {{ user.lastName }}
      {% endcapture %}
      {{ fullName }}
      {{ user.email }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.firstName', 'user.lastName', 'user.email']);
  });

  it('should handle increment and decrement tags', () => {
    const template = `
      {% increment counter %}
      {% decrement counter %}
      {{ user.name }}
      {{ counter }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.name']);
  });

  it('should reject unsupported tablerow tag', () => {
    const template = `
      {% tablerow item in products %}
        {{ item.name }} - {{ item.price }}
      {% endtablerow %}
      {{ total }}
    `;

    expect(() => extractTemplateVariables(template)).toThrow('tablerow');
  });

  it('should handle cycle tag in loops', () => {
    const template = `
      {% for item in items %}
        {% cycle 'odd', 'even' %}: {{ item.name }}
      {% endfor %}
      {{ summary }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['items', 'summary']);
  });

  it('should handle break and continue in loops', () => {
    const template = `
      {% for item in products %}
        {% if item.price > maxPrice %}{% continue %}{% endif %}
        {% if item.stock == 0 %}{% break %}{% endif %}
        {{ item.name }}
      {% endfor %}
      {{ total }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['products', 'maxPrice', 'total']);
  });

  it('should handle complex filter chains with variable arguments', () => {
    const template = `
      {{ products | where: "type", category | sort: sortField }}
      {{ user.name | default: defaultName }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['products', 'category', 'sortField', 'user.name', 'defaultName']);
  });

  it('should handle nested for loops with multiple local variables', () => {
    const template = `
      {% for category in categories %}
        {% for product in category.items %}
          {{ product.name }} - {{ category.name }}
        {% endfor %}
        {{ category.total }}
      {% endfor %}
      {{ grandTotal }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['categories', 'grandTotal']);
  });

  it('should handle complex operator expressions', () => {
    const template = `
      {% if user.age >= minAge and user.age <= maxAge or user.isVIP %}
        {{ user.discount }}
      {% endif %}
      {% if product.inStock and product.price < budget %}
        {{ product.name }}
      {% endif %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'user.age',
      'user.isVIP',
      'user.discount',
      'minAge',
      'maxAge',
      'product.inStock',
      'product.price',
      'product.name',
      'budget',
    ]);
  });

  it('should handle empty and blank values', () => {
    const template = `
      {% if user.name == empty %}
        {{ defaultUser.name }}
      {% endif %}
      {% if product.description == blank %}
        {{ product.shortDesc }}
      {% endif %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'user.name',
      'defaultUser.name',
      'product.description',
      'product.shortDesc',
    ]);
  });

  it('should handle forloop special variables', () => {
    const template = `
      {% for item in items %}
        {{ forloop.index }}: {{ item.name }}
        {% if forloop.first %}
          First: {{ item.id }}
        {% endif %}
        {% if forloop.last %}
          Last: {{ item.id }}
        {% endif %}
      {% endfor %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['items']);
  });

  it('should handle unless with elsif', () => {
    const template = `
      {% unless user.isActive %}
        {{ inactiveMessage }}
      {% elsif user.isPending %}
        {{ pendingMessage }}
      {% else %}
        {{ user.status }}
      {% endunless %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'user.isActive',
      'user.isPending',
      'user.status',
      'inactiveMessage',
      'pendingMessage',
    ]);
  });

  it('should reject unsupported tablerow with range', () => {
    const template = `
      {% tablerow i in (1..num) %}
        {{ items[i] }}
      {% endtablerow %}
    `;

    expect(() => extractTemplateVariables(template)).toThrow('tablerow');
  });

  it('should handle nested captures', () => {
    const template = `
      {% capture outer %}
        {{ user.title }}
        {% capture inner %}
          {{ user.firstName }} {{ user.lastName }}
        {% endcapture %}
        {{ inner }}
      {% endcapture %}
      {{ outer }}
      {{ user.email }}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['user.title', 'user.firstName', 'user.lastName', 'user.email']);
  });

  it('should handle case with multiple when clauses', () => {
    const template = `
      {% case order.status %}
        {% when "pending" %}
          {{ order.estimatedTime }}
        {% when "processing" %}
          {{ order.currentStep }}
        {% when "shipped" %}
          {{ order.trackingNumber }}
        {% when "delivered" %}
          {{ order.deliveryDate }}
        {% else %}
          {{ order.errorMessage }}
      {% endcase %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'order.status',
      'order.estimatedTime',
      'order.currentStep',
      'order.trackingNumber',
      'order.deliveryDate',
      'order.errorMessage',
    ]);
  });

  it('should handle complex nested conditionals', () => {
    const template = `
      {% if user.isLoggedIn %}
        {% if user.hasAccess %}
          {% unless user.isBlocked %}
            {{ user.dashboard }}
          {% else %}
            {{ blockedMessage }}
          {% endunless %}
        {% else %}
          {{ accessDenied }}
        {% endif %}
      {% else %}
        {{ loginPrompt }}
      {% endif %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual([
      'user.isLoggedIn',
      'user.hasAccess',
      'user.isBlocked',
      'user.dashboard',
      'blockedMessage',
      'accessDenied',
      'loginPrompt',
    ]);
  });

  it('should handle for loop with offset and limit', () => {
    const template = `
      {% for item in products offset: startIndex limit: pageSize %}
        {{ item.name }}
      {% endfor %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['products', 'startIndex', 'pageSize']);
  });

  it('should handle reversed for loops', () => {
    const template = `
      {% for item in products reversed %}
        {{ item.name }}
      {% endfor %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['products']);
  });

  it('should handle json_parse filters', () => {
    const template = `
      {% for item in products | json_parse %}
        {{ item.name }}
      {% endfor %}
    `;

    const variables = extractTemplateVariables(template);
    expect(variables).toEqual(['products']);
  });
});
