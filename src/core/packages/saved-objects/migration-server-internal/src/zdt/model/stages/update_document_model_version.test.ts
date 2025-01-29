/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import {
  createContextMock,
  createOutdatedDocumentSearchState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { UpdateDocumentModelVersionsState } from '../../state';
import type { StateActionResponse } from '../types';
import { updateDocumentModelVersion } from './update_document_model_version';

describe('Stage: updateDocumentModelVersion', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<UpdateDocumentModelVersionsState> = {}
  ): UpdateDocumentModelVersionsState => ({
    ...createOutdatedDocumentSearchState(),
    controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('UPDATE_DOCUMENT_MODEL_VERSIONS -> UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES when successful', () => {
    const state = createState({});
    const res = Either.right(
      'update_mappings_succeeded'
    ) as StateActionResponse<'UPDATE_DOCUMENT_MODEL_VERSIONS'>;

    const newState = updateDocumentModelVersion(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES',
      currentIndexMeta: expect.any(Object),
    });
  });

  it('updates state.currentIndexMeta when successful', () => {
    const state = createState({
      currentIndexMeta: {
        mappingVersions: { foo: '10.1.0', bar: '10.2.0' },
        docVersions: { foo: '0.0.0', bar: '0.0.0' },
        migrationState: {
          convertingDocuments: true,
        },
      },
    });
    const res = Either.right(
      'update_mappings_succeeded'
    ) as StateActionResponse<'UPDATE_DOCUMENT_MODEL_VERSIONS'>;

    const newState = updateDocumentModelVersion(state, res, context);

    expect(newState.currentIndexMeta).toEqual({
      mappingVersions: { foo: '10.1.0', bar: '10.2.0' },
      docVersions: { foo: '10.1.0', bar: '10.2.0' },
      migrationState: {
        convertingDocuments: false,
      },
    });
  });
});
