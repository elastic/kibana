/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { UpdateESQLQueryAction } from './update_esql_query_actions';

describe('update ES|QL query action', () => {
  const dataMock = dataPluginMock.createStartContract();
  describe('compatibility check', () => {
    it('is incompatible if no query is applied', async () => {
      const updateQueryAction = new UpdateESQLQueryAction(dataMock);
      const isCompatible = await updateQueryAction.isCompatible();

      expect(isCompatible).toBeFalsy();
    });

    it('is incompatible if query is not ES|QL', async () => {
      dataMock.query.queryString.getQuery = jest.fn().mockReturnValue({ query: 'not esql' });
      const updateQueryAction = new UpdateESQLQueryAction(dataMock);
      const isCompatible = await updateQueryAction.isCompatible();

      expect(isCompatible).toBeFalsy();
    });

    it('is compatible if query is ES|QL', async () => {
      dataMock.query.queryString.getQuery = jest.fn().mockReturnValue({ esql: 'from meow' });
      const updateQueryAction = new UpdateESQLQueryAction(dataMock);
      const isCompatible = await updateQueryAction.isCompatible();

      expect(isCompatible).toBeTruthy();
    });
  });
});
