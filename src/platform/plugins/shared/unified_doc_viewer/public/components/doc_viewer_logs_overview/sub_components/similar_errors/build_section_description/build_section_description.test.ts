/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSectionDescription } from '.';
import { fieldConstants } from '@kbn/discover-utils';

describe('buildSectionDescription', () => {
  it('returns description with all fields when all values are present', () => {
    const result = buildSectionDescription({
      serviceName: { value: 'test-service', field: fieldConstants.SERVICE_NAME_FIELD },
      culprit: { value: 'test-culprit', field: fieldConstants.ERROR_CULPRIT_FIELD },
      message: { value: 'test-message', field: 'message' },
      type: { value: 'test-type', field: 'exception.type' },
      groupingName: { value: 'test-grouping', field: fieldConstants.ERROR_GROUPING_NAME_FIELD },
    });

    expect(result).toBe(
      `These errors are based on the following fields: ${fieldConstants.SERVICE_NAME_FIELD}, ${fieldConstants.ERROR_CULPRIT_FIELD}, message, exception.type, ${fieldConstants.ERROR_GROUPING_NAME_FIELD}.`
    );
  });

  it('returns description with only serviceName when no other fields are present', () => {
    const result = buildSectionDescription({
      serviceName: { value: 'test-service', field: fieldConstants.SERVICE_NAME_FIELD },
    });

    expect(result).toBe(
      `These errors are based on the following fields: ${fieldConstants.SERVICE_NAME_FIELD}.`
    );
  });

  it('returns description with serviceName and culprit only', () => {
    const result = buildSectionDescription({
      serviceName: { value: 'test-service', field: fieldConstants.SERVICE_NAME_FIELD },
      culprit: { value: 'test-culprit', field: fieldConstants.ERROR_CULPRIT_FIELD },
    });

    expect(result).toBe(
      `These errors are based on the following fields: ${fieldConstants.SERVICE_NAME_FIELD}, ${fieldConstants.ERROR_CULPRIT_FIELD}.`
    );
  });

  it('returns description with serviceName and message only', () => {
    const result = buildSectionDescription({
      serviceName: { value: 'test-service', field: fieldConstants.SERVICE_NAME_FIELD },
      message: { value: 'test-message', field: 'message' },
    });

    expect(result).toBe(
      `These errors are based on the following fields: ${fieldConstants.SERVICE_NAME_FIELD}, message.`
    );
  });

  it('filters out fields with falsy values', () => {
    const result = buildSectionDescription({
      serviceName: { value: 'test-service', field: fieldConstants.SERVICE_NAME_FIELD },
      culprit: { value: '', field: fieldConstants.ERROR_CULPRIT_FIELD },
      message: { value: null, field: 'message' },
      type: { value: undefined, field: 'exception.type' },
    });

    expect(result).toBe(
      `These errors are based on the following fields: ${fieldConstants.SERVICE_NAME_FIELD}.`
    );
  });

  it('includes groupingName when present', () => {
    const result = buildSectionDescription({
      serviceName: { value: 'test-service', field: fieldConstants.SERVICE_NAME_FIELD },
      culprit: { value: 'test-culprit', field: fieldConstants.ERROR_CULPRIT_FIELD },
      message: { value: 'test-message', field: 'message' },
      groupingName: { value: 'test-grouping', field: fieldConstants.ERROR_GROUPING_NAME_FIELD },
    });

    expect(result).toBe(
      `These errors are based on the following fields: ${fieldConstants.SERVICE_NAME_FIELD}, ${fieldConstants.ERROR_CULPRIT_FIELD}, message, ${fieldConstants.ERROR_GROUPING_NAME_FIELD}.`
    );
  });

  it('returns undefined when serviceName value is falsy', () => {
    const result = buildSectionDescription({
      serviceName: { value: '', field: fieldConstants.SERVICE_NAME_FIELD },
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when serviceName is undefined and no other fields are present', () => {
    const result = buildSectionDescription({});

    expect(result).toBeUndefined();
  });

  it('returns description with other fields when serviceName is undefined', () => {
    const result = buildSectionDescription({
      culprit: { value: 'test-culprit', field: fieldConstants.ERROR_CULPRIT_FIELD },
      message: { value: 'test-message', field: 'message' },
    });

    expect(result).toBe(
      `These errors are based on the following fields: ${fieldConstants.ERROR_CULPRIT_FIELD}, message.`
    );
  });

  it('returns undefined when all fields have falsy values', () => {
    const result = buildSectionDescription({
      serviceName: { value: '', field: fieldConstants.SERVICE_NAME_FIELD },
      culprit: { value: null, field: fieldConstants.ERROR_CULPRIT_FIELD },
      message: { value: undefined, field: 'message' },
    });

    expect(result).toBeUndefined();
  });
});
