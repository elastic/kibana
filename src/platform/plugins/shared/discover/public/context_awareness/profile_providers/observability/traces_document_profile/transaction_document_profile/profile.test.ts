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
import { createContextAwarenessMocks } from '../../../../__mocks__';
import { createObservabilityTracesTransactionDocumentProfileProvider } from './profile';
import type { ContextWithProfileId } from '../../../../profile_service';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../../consts';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import { applicationMock } from '../__mocks__/application_mock';
import { DEFAULT_ALLOWED_TRACES_BASE_PATTERNS } from '@kbn/discover-utils/src';

describe('transactionDocumentProfileProvider', () => {
  const ROOT_CONTEXT = ({
    profileId,
  }: {
    profileId: string;
  }): ContextWithProfileId<RootContext> => {
    return {
      profileId,
      solutionType: SolutionType.Observability,
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

  describe('when root profile is observability', () => {
    const profileId = OBSERVABILITY_ROOT_PROFILE_ID;
    const mockServices: ProfileProviderServices = {
      ...createContextAwarenessMocks().profileProviderServices,
    };

    const transactionDocumentProfileProvider =
      createObservabilityTracesTransactionDocumentProfileProvider(mockServices);

    it('matches records with the correct index pattern, data stream type and the correct processor event', () => {
      expect(
        transactionDocumentProfileProvider.resolve({
          rootContext: ROOT_CONTEXT({ profileId }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildMockRecord(DEFAULT_ALLOWED_TRACES_BASE_PATTERNS[0], {
            'data_stream.type': ['traces'],
            'processor.event': ['transaction'],
          }),
        })
      ).toEqual(RESOLUTION_MATCH);
    });

    it('does not match records with neither characteristic', () => {
      expect(
        transactionDocumentProfileProvider.resolve({
          rootContext: ROOT_CONTEXT({ profileId }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildMockRecord('another-index'),
        })
      ).toEqual(RESOLUTION_MISMATCH);
    });
  });

  describe('when root profile is NOT observability', () => {
    const profileId = 'another-profile';
    const mockServices: ProfileProviderServices = {
      ...createContextAwarenessMocks().profileProviderServices,
      ...applicationMock({}),
    };

    const transactionDocumentProfileProvider =
      createObservabilityTracesTransactionDocumentProfileProvider(mockServices);

    it('does not match records with the correct data stream type and the correct processor event', () => {
      expect(
        transactionDocumentProfileProvider.resolve({
          rootContext: ROOT_CONTEXT({ profileId }),
          dataSourceContext: DATA_SOURCE_CONTEXT,
          record: buildMockRecord(DEFAULT_ALLOWED_TRACES_BASE_PATTERNS[0], {
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
