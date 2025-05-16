/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildAlertFieldsRequest } from './build_fields_request';
import { ALERT_EVENTS_FIELDS } from './fields';

describe('buildFieldsRequest', () => {
  it('should include ecs fields by default', () => {
    const fields: string[] = [];
    const fieldsRequest = buildAlertFieldsRequest(fields);
    expect(fieldsRequest).toHaveLength(ALERT_EVENTS_FIELDS.length);
  });

  it('should not show ecs fields', () => {
    const fields: string[] = [];
    const fieldsRequest = buildAlertFieldsRequest(fields, true);
    expect(fieldsRequest).toHaveLength(0);
  });

  it('should map the expected (non underscore prefixed) fields', () => {
    const fields = ['_dontShow1', '_dontShow2', 'showsup'];
    const fieldsRequest = buildAlertFieldsRequest(fields, true);
    expect(fieldsRequest).toEqual([{ field: 'showsup', include_unmapped: true }]);
  });

  it('should map provided fields with ecs fields', () => {
    const fields = ['showsup'];
    const fieldsRequest = buildAlertFieldsRequest(fields);
    expect(fieldsRequest).toHaveLength(ALERT_EVENTS_FIELDS.length + fields.length);
  });
});
