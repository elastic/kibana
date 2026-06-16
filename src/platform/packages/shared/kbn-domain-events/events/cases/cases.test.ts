/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import {
  CASE_CREATED_EVENT_TYPE,
  caseCreatedPayloadSchema,
  isCaseCreatedPayload,
} from './case_created';
import type { CaseCreatedPayload } from './case_created';
import {
  CASE_UPDATED_EVENT_TYPE,
  caseUpdatedPayloadSchema,
  isCaseUpdatedPayload,
} from './case_updated';
import type { CaseUpdatedPayload } from './case_updated';
import { casesEventPayloadSchemas } from '.';
import type { CasesDomainEventMap } from '.';
import { domainEventPayloadSchemas } from '..';
import type { DomainEventMap } from '..';

describe('cases domain event schemas', () => {
  const validCaseCreatedPayload: CaseCreatedPayload = {
    caseId: 'case-1',
    owner: 'securitySolution',
    title: 'Investigate login',
  };

  const validCaseUpdatedPayload: CaseUpdatedPayload = {
    caseId: 'case-1',
    updatedFields: {
      title: 'Updated title',
    },
  };

  it('isCaseCreatedPayload accepts valid payload and rejects invalid payloads', () => {
    expect(isCaseCreatedPayload(validCaseCreatedPayload)).toBe(true);
    expect(isCaseCreatedPayload({ ...validCaseCreatedPayload, extra: 'field' })).toBe(false);
    expect(isCaseCreatedPayload({ caseId: 'case-1' })).toBe(false);
    expect(isCaseCreatedPayload({ caseId: 1, owner: 'x', title: 'y' })).toBe(false);
  });

  it('isCaseUpdatedPayload accepts valid payload and rejects invalid payloads', () => {
    expect(isCaseUpdatedPayload(validCaseUpdatedPayload)).toBe(true);
    expect(isCaseUpdatedPayload({ ...validCaseUpdatedPayload, extra: 'field' })).toBe(false);
    expect(isCaseUpdatedPayload({ caseId: 'case-1' })).toBe(false);
  });

  it('domainEventPayloadSchemas validates the same payloads as per-event guards', () => {
    expect(
      domainEventPayloadSchemas[CASE_CREATED_EVENT_TYPE].safeParse(validCaseCreatedPayload).success
    ).toBe(isCaseCreatedPayload(validCaseCreatedPayload));
    expect(
      domainEventPayloadSchemas[CASE_UPDATED_EVENT_TYPE].safeParse(validCaseUpdatedPayload).success
    ).toBe(isCaseUpdatedPayload(validCaseUpdatedPayload));
    expect(
      casesEventPayloadSchemas[CASE_CREATED_EVENT_TYPE].safeParse(validCaseCreatedPayload).success
    ).toBe(true);
  });

  it('keeps schema keys aligned with DomainEventMap payload types', () => {
    type CaseCreatedSchemaOutput = z.infer<typeof caseCreatedPayloadSchema>;
    type CaseUpdatedSchemaOutput = z.infer<typeof caseUpdatedPayloadSchema>;

    const caseCreatedPayload: DomainEventMap[typeof CASE_CREATED_EVENT_TYPE] =
      validCaseCreatedPayload;
    const caseUpdatedPayload: DomainEventMap[typeof CASE_UPDATED_EVENT_TYPE] =
      validCaseUpdatedPayload;

    const createdFromSchema: CaseCreatedSchemaOutput =
      caseCreatedPayloadSchema.parse(validCaseCreatedPayload);
    const updatedFromSchema: CaseUpdatedSchemaOutput =
      caseUpdatedPayloadSchema.parse(validCaseUpdatedPayload);

    expect(createdFromSchema).toEqual(caseCreatedPayload);
    expect(updatedFromSchema).toEqual(caseUpdatedPayload);

    const casesMapKey: keyof CasesDomainEventMap = CASE_CREATED_EVENT_TYPE;
    expect(casesMapKey).toBe(CASE_CREATED_EVENT_TYPE);
  });
});
