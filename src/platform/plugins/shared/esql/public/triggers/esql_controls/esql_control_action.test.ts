/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { ESQLVariableType } from '@kbn/esql-validation-autocomplete';
import { CreateESQLControlAction } from './esql_control_action';

describe('update ES|QL query action', () => {
  const dataMock = dataPluginMock.createStartContract();
  const searchMock = dataMock.search.search;
  const coreStart = coreMock.createStart();
  describe('compatibility check', () => {
    it('is incompatible if no query is applied', async () => {
      const createControlAction = new CreateESQLControlAction(coreStart, searchMock);
      const isCompatible = await createControlAction.isCompatible({
        queryString: '',
        variableType: ESQLVariableType.FIELDS,
        esqlVariables: [],
      });

      expect(isCompatible).toBeFalsy();
    });

    it('is compatible if queryString is given', async () => {
      const createControlAction = new CreateESQLControlAction(coreStart, searchMock);
      const isCompatible = await createControlAction.isCompatible({
        queryString: 'FROM meow',
        variableType: ESQLVariableType.FIELDS,
        esqlVariables: [],
      });

      expect(isCompatible).toBeTruthy();
    });
  });
});
