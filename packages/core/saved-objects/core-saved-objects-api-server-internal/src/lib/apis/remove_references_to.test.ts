/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiContextMock, ApiExecutionContextMock } from '../../mocks';
import { createType } from '../../test_helpers/repository.test.common';
import { performRemoveReferencesTo } from './remove_references_to';

const fooType = createType('foo', {});
const barType = createType('bar', {});

describe('performRemoveReferencesTo', () => {
  const namespace = 'some_ns';
  const indices = ['.kib_1', '.kib_2'];
  let apiExecutionContext: ApiExecutionContextMock;

  beforeEach(() => {
    apiExecutionContext = apiContextMock.create();
    apiExecutionContext.registry.registerType(fooType);
    apiExecutionContext.registry.registerType(barType);

    apiExecutionContext.helpers.common.getCurrentNamespace.mockImplementation(
      (space) => space ?? 'default'
    );
    apiExecutionContext.helpers.common.getIndicesForTypes.mockReturnValue(indices);
  });

  describe('with all extensions enabled', () => {
    it('calls getCurrentNamespace with the correct parameters', async () => {
      await performRemoveReferencesTo(
        { type: 'foo', id: 'id', options: { namespace } },
        apiExecutionContext
      );

      const commonHelper = apiExecutionContext.helpers.common;
      expect(commonHelper.getCurrentNamespace).toHaveBeenCalledTimes(1);
      expect(commonHelper.getCurrentNamespace).toHaveBeenLastCalledWith(namespace);
    });

    it('calls authorizeRemoveReferences with the correct parameters', async () => {
      await performRemoveReferencesTo(
        { type: 'foo', id: 'id', options: { namespace } },
        apiExecutionContext
      );

      const securityExt = apiExecutionContext.extensions.securityExtension!;
      expect(securityExt.authorizeRemoveReferences).toHaveBeenCalledTimes(1);
      expect(securityExt.authorizeRemoveReferences).toHaveBeenLastCalledWith({
        namespace,
        object: { type: 'foo', id: 'id' },
      });
    });

    it('calls client.updateByQuery with the correct parameters', async () => {
      await performRemoveReferencesTo(
        { type: 'foo', id: 'id', options: { namespace, refresh: false } },
        apiExecutionContext
      );

      const client = apiExecutionContext.client;
      expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      expect(client.updateByQuery).toHaveBeenLastCalledWith(
        {
          refresh: false,
          index: indices,
          body: expect.any(Object),
        },
        { ignore: [404], meta: true }
      );
    });
  });
});
