/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const getApiAuth = () => ({
  user: Cypress.env('KIBANA_USERNAME') ?? Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('KIBANA_PASSWORD') ?? Cypress.env('ELASTICSEARCH_PASSWORD'),
});

export const COMMON_API_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress',
  'x-elastic-internal-origin': 'security-solution',
  'elastic-api-version': '2023-10-31',
});

export const request = <T = unknown>({
  headers,
  ...options
}: Partial<Cypress.RequestOptions>): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: getApiAuth(),
    headers: { ...COMMON_API_HEADERS, ...headers },
    ...options,
  });
