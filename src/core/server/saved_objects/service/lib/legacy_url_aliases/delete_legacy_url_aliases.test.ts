/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockGetEsErrorMessage } from './delete_legacy_url_aliases.test.mock'; // Note: importing this file applies default mocks for other functions too

import { errors as EsErrors } from '@elastic/elasticsearch';

import { elasticsearchClientMock } from '../../../../elasticsearch/client/mocks';
import { typeRegistryMock } from '../../../saved_objects_type_registry.mock';
import { ALL_NAMESPACES_STRING } from '../utils';
import { deleteLegacyUrlAliases } from './delete_legacy_url_aliases';
import type { DeleteLegacyUrlAliasesParams } from './delete_legacy_url_aliases';

type SetupParams = Pick<
  DeleteLegacyUrlAliasesParams,
  'type' | 'id' | 'namespaces' | 'deleteBehavior'
>;

describe('deleteLegacyUrlAliases', () => {
  function setup(setupParams: SetupParams) {
    return {
      mappings: { properties: {} }, // doesn't matter, only used as an argument to getSearchDsl which is mocked
      registry: typeRegistryMock.create(), // doesn't matter, only used as an argument to getSearchDsl which is mocked
      client: elasticsearchClientMock.createElasticsearchClient(),
      getIndexForType: jest.fn(), // doesn't matter
      ...setupParams,
    };
  }

  const type = 'obj-type';
  const id = 'obj-id';

  it('throws an error if namespaces includes the "all namespaces" string', async () => {
    const namespaces = [ALL_NAMESPACES_STRING];
    const params = setup({ type, id, namespaces, deleteBehavior: 'inclusive' });

    await expect(() => deleteLegacyUrlAliases(params)).rejects.toThrowError(
      `Failed to delete legacy URL aliases for ${type}/${id}: "namespaces" cannot include the * string`
    );
    expect(params.client.updateByQuery).not.toHaveBeenCalled();
  });

  it('throws an error if updateByQuery fails', async () => {
    const namespaces = ['space-a', 'space-b'];
    const params = setup({ type, id, namespaces, deleteBehavior: 'inclusive' });
    const esError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 500,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      })
    );
    params.client.updateByQuery.mockResolvedValueOnce(Promise.reject(esError));
    mockGetEsErrorMessage.mockClear();
    mockGetEsErrorMessage.mockReturnValue('Oh no!');

    await expect(() => deleteLegacyUrlAliases(params)).rejects.toThrowError(
      `Failed to delete legacy URL aliases for ${type}/${id}: Oh no!`
    );
    expect(params.client.updateByQuery).toHaveBeenCalledTimes(1);
    expect(mockGetEsErrorMessage).toHaveBeenCalledTimes(1);
    expect(mockGetEsErrorMessage).toHaveBeenCalledWith(esError);
  });

  describe('deleteBehavior "inclusive"', () => {
    const deleteBehavior = 'inclusive' as const;

    it('when namespaces is empty, returns early', async () => {
      const namespaces: string[] = [];
      const params = setup({ type, id, namespaces, deleteBehavior });

      await deleteLegacyUrlAliases(params);
      expect(params.client.updateByQuery).not.toHaveBeenCalled();
    });

    it('when namespaces is not empty, calls updateByQuery with expected script params', async () => {
      const namespaces = ['space-a', 'default', 'space-b'];
      const params = setup({ type, id, namespaces, deleteBehavior });

      await deleteLegacyUrlAliases(params);
      expect(params.client.updateByQuery).toHaveBeenCalledTimes(1);
      expect(params.client.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            script: expect.objectContaining({
              params: {
                namespaces,
                matchTargetNamespaceOp: 'delete',
                notMatchTargetNamespaceOp: 'noop',
              },
            }),
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('deleteBehavior "exclusive"', () => {
    const deleteBehavior = 'exclusive' as const;

    async function doTest(namespaces: string[]) {
      const params = setup({ type, id, namespaces, deleteBehavior });

      await deleteLegacyUrlAliases(params);
      expect(params.client.updateByQuery).toHaveBeenCalledTimes(1);
      expect(params.client.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            script: expect.objectContaining({
              params: {
                namespaces,
                matchTargetNamespaceOp: 'noop',
                notMatchTargetNamespaceOp: 'delete',
              },
            }),
          }),
        }),
        expect.anything()
      );
    }

    it('when namespaces is empty, calls updateByQuery with expected script params', async () => {
      const namespaces: string[] = [];
      await doTest(namespaces);
    });

    it('when namespaces is not empty, calls updateByQuery with expected script params', async () => {
      const namespaces = ['space-a', 'default', 'space-b'];
      await doTest(namespaces);
    });
  });
});
