/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getKqlFieldNamesFromExpression } from './get_kql_fields';

describe('getKqlFieldNames', () => {
  it('returns single kuery field', () => {
    const expression = 'service.name: my-service';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual(['service.name']);
  });

  it('returns kuery fields with wildcard', () => {
    const expression = 'service.name: *';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual(['service.name']);
  });

  it('returns multiple fields used AND operator', () => {
    const expression = 'service.name: my-service AND service.environment: production';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual([
      'service.name',
      'service.environment',
    ]);
  });

  it('returns multiple kuery fields with OR operator', () => {
    const expression = 'network.carrier.mcc: test or child.id: 33';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual(['network.carrier.mcc', 'child.id']);
  });

  it('returns multiple kuery fields with wildcard', () => {
    const expression = 'network.carrier.mcc:* or child.id: *';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual(['network.carrier.mcc', 'child.id']);
  });

  it('returns single kuery fields with gt operator', () => {
    const expression = 'transaction.duration.aggregate > 10';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual(['transaction.duration.aggregate']);
  });

  it('returns duplicate fields', () => {
    const expression = 'service.name: my-service and service.name: my-service and trace.id: trace';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual([
      'service.name',
      'service.name',
      'trace.id',
    ]);
  });

  it('returns multiple fields with multiple logical operators', () => {
    const expression =
      '(service.name:opbeans-* OR service.name:kibana) and (service.environment:production)';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual([
      'service.name',
      'service.name',
      'service.environment',
    ]);
  });

  it('returns nested fields', () => {
    const expression = 'user.names:{ first: "Alice" and last: "White" }';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual(['user.names']);
  });

  it('returns wildcard fields', () => {
    const expression = 'server.*: kibana';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual(['server.*']);
  });

  // _field_caps doesn't allow escaped wildcards, so for now this behavior is what we want
  it('returns escaped fields', () => {
    const expression = 'server.\\*: kibana';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual(['server.*']);
  });

  it('do not return if kuery field is null', () => {
    const expression = 'opbean';
    expect(getKqlFieldNamesFromExpression(expression)).toEqual([]);
  });
});
