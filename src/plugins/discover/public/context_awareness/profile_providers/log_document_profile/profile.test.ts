/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { DocumentType } from '../../profiles';
import { createContextAwarenessMocks } from '../../__mocks__';
import { createLogDocumentProfileProvider } from './profile';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('logDocumentProfileProvider', () => {
  const logDocumentProfileProvider = createLogDocumentProfileProvider(mockServices);
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: {
      type: DocumentType.Log,
    },
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it('matches records with the correct data stream type', () => {
    expect(
      logDocumentProfileProvider.resolve({
        record: buildMockRecord('logs-2000-01-01', {
          'data_stream.type': ['logs'],
        }),
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('matches records with fields prefixed with "log."', () => {
    expect(
      logDocumentProfileProvider.resolve({
        record: buildMockRecord('logs-2000-01-01', {
          'log.level': ['INFO'],
        }),
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('matches records with indices matching the allowed pattern', () => {
    expect(
      logDocumentProfileProvider.resolve({
        record: buildMockRecord('logs-2000-01-01'),
      })
    ).toEqual(RESOLUTION_MATCH);
    expect(
      logDocumentProfileProvider.resolve({
        record: buildMockRecord('remote_cluster:filebeat'),
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('does not match records with neither characteristic', () => {
    expect(
      logDocumentProfileProvider.resolve({
        record: buildMockRecord('another-index'),
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });
});

const buildMockRecord = (index: string, fields: Record<string, unknown[]> = {}) =>
  buildDataTableRecord({
    _id: '',
    _index: index,
    fields: {
      _index: index,
      ...fields,
    },
  });
