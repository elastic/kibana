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
import { createObservabilityTracesTransactionDocumentProfileProvider } from './profile';
import type { ContextWithProfileId } from '../../../../profile_service';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';
import { createContextAwarenessMocks } from '../../../../__mocks__';
import type { ProfileProviderServices } from '../../../profile_provider_services';

describe('transactionDocumentProfileProvider', () => {
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
    profileId: 'traces-transaction-document-profile',
    category: DataSourceCategory.Traces,
  };
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: {
      type: DocumentType.Transaction,
    },
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  const mockServices: ProfileProviderServices = {
    ...createContextAwarenessMocks().profileProviderServices,
  };

  describe('when root profile is observability', () => {
    const profileId = OBSERVABILITY_ROOT_PROFILE_ID;
    const transactionDocumentProfileProvider =
      createObservabilityTracesTransactionDocumentProfileProvider(mockServices);

    it('matches records with the correct data stream type and the correct processor event', () => {
      expect(
        transactionDocumentProfileProvider.resolve({
          rootContext: getRootContext({ profileId }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildMockRecord('index', {
            'data_stream.type': ['traces'],
            'processor.event': ['transaction'],
          }),
        })
      ).toEqual(RESOLUTION_MATCH);
    });

    it('does not match records with neither characteristic', () => {
      expect(
        transactionDocumentProfileProvider.resolve({
          rootContext: getRootContext({ profileId }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildMockRecord('another-index'),
        })
      ).toEqual(RESOLUTION_MISMATCH);
    });
  });

  describe('when solutionType is NOT observability', () => {
    const profileId = OBSERVABILITY_ROOT_PROFILE_ID;
    const solutionType = SolutionType.Default;
    const transactionDocumentProfileProvider =
      createObservabilityTracesTransactionDocumentProfileProvider(mockServices);

    it('does not match records with the correct data stream type and the correct processor event', () => {
      expect(
        transactionDocumentProfileProvider.resolve({
          rootContext: getRootContext({ profileId, solutionType }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildMockRecord('index', {
            'data_stream.type': ['traces'],
            'processor.event': ['transaction'],
          }),
        })
      ).toEqual(RESOLUTION_MISMATCH);
    });
  });
});

const buildMockRecord = (index: string, fields: Record<string, unknown> = {}) =>
  buildDataTableRecord({
    _id: '',
    _index: index,
    fields: {
      _index: index,
      ...fields,
    },
  });
