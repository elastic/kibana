/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataSourceContext, RootContext } from '../../../../profiles';
import { DataSourceCategory, DocumentType, SolutionType } from '../../../../profiles';
import { createProfileProviderSharedServicesMock } from '../../../../__mocks__';
import { createObservabilityTracesDocumentProfileProvider } from './profile';
import type { ContextWithProfileId } from '../../../../profile_service';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';

describe('tracesDocumentProfileProvider', () => {
  const getRootContext = ({
    profileId,
    solutionType,
  }: {
    profileId: string;
    solutionType?: SolutionType;
  }): ContextWithProfileId<RootContext> => {
    return {
      profileId,
      solutionType: solutionType ?? SolutionType.Observability,
    };
  };

  const DATA_SOURCE_CONTEXT: ContextWithProfileId<DataSourceContext> = {
    profileId: 'traces-document-profile',
    category: DataSourceCategory.Traces,
  };
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: {
      type: DocumentType.Trace,
    },
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  const mockServices = createProfileProviderSharedServicesMock();

  describe('when root profile is observability', () => {
    const profileId = OBSERVABILITY_ROOT_PROFILE_ID;

    const spanDocumentProfileProvider =
      createObservabilityTracesDocumentProfileProvider(mockServices);

    it('matches records with at least the correct source and a trace id', () => {
      expect(
        spanDocumentProfileProvider.resolve({
          rootContext: getRootContext({ profileId }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildTraceMockRecord('traces-index', {
            'trace.id': ['c0ffee'],
          }),
        })
      ).toEqual(RESOLUTION_MATCH);
    });

    it('does not match records with no trace id', () => {
      expect(
        spanDocumentProfileProvider.resolve({
          rootContext: getRootContext({ profileId }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildTraceMockRecord('traces-index'),
        })
      ).toEqual(RESOLUTION_MISMATCH);
    });

    it('matches records with the correct trace id and any OTEL `kind` field (unprocessed spans)', () => {
      expect(
        spanDocumentProfileProvider.resolve({
          rootContext: getRootContext({ profileId }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildTraceMockRecord('traces-index', {
            'trace.id': ['c0ffee'],
            kind: 'Internal',
          }),
        })
      ).toEqual(RESOLUTION_MATCH);
    });
  });

  describe('when root profile is NOT observability', () => {
    const profileId = 'another-profile';
    const solutionType = SolutionType.Security;
    const spanDocumentProfileProvider =
      createObservabilityTracesDocumentProfileProvider(mockServices);

    it('does not match records with the correct data source and a trace id', () => {
      expect(
        spanDocumentProfileProvider.resolve({
          rootContext: getRootContext({ profileId, solutionType }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildTraceMockRecord('traces-index', {
            'trace.id': ['c0ffee'],
          }),
        })
      ).toEqual(RESOLUTION_MISMATCH);
    });
  });
});

const buildTraceMockRecord = (index: string, fields: Record<string, unknown> = {}) =>
  buildDataTableRecord({
    _id: '',
    _index: index,
    fields: {
      _index: index,
      ...fields,
    },
  });
