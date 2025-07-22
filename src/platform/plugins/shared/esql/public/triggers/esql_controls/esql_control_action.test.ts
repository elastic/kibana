/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { ESQLVariableType } from '@kbn/esql-types';
import { CreateESQLControlAction } from './esql_control_action';

describe('update ES|QL query action', () => {
  const dataMock = dataPluginMock.createStartContract();
  const searchMock = dataMock.search.search;
  const timefilterMock = dataMock.query.timefilter.timefilter;
  const core = coreMock.createStart();
  const coreStart = {
    ...core,
    uiSettings: {
      ...core.uiSettings,
      get: (setting: string) => {
        return setting === 'enableESQL';
      },
    },
  } as CoreStart;
  describe('compatibility check', () => {
    it('is compatible if queryString is given', async () => {
      const createControlAction = new CreateESQLControlAction(
        coreStart,
        searchMock,
        timefilterMock
      );
      const isCompatible = await createControlAction.isCompatible({
        queryString: 'FROM index',
        variableType: ESQLVariableType.FIELDS,
        esqlVariables: [],
      });

      expect(isCompatible).toBeTruthy();
    });

    it('is incompatible if the ES|QL switch is off', async () => {
      const coreStartESQLDidabled = {
        ...core,
        uiSettings: {
          ...core.uiSettings,
          get: (setting: string) => {
            return setting === 'enableESQL' ? false : true;
          },
        },
      } as CoreStart;
      const createControlAction = new CreateESQLControlAction(
        coreStartESQLDidabled,
        searchMock,
        timefilterMock
      );
      const isCompatible = await createControlAction.isCompatible({
        queryString: '',
        variableType: ESQLVariableType.FIELDS,
        esqlVariables: [],
      });

      expect(isCompatible).toBeFalsy();
    });

    it('is incompatible if variableType is invalid', async () => {
      const createControlAction = new CreateESQLControlAction(
        coreStart,
        searchMock,
        timefilterMock
      );
      const isCompatible = await createControlAction.isCompatible({
        queryString: 'FROM index',
        variableType: 'INVALID_TYPE' as ESQLVariableType,
        esqlVariables: [],
      });

      expect(isCompatible).toBeFalsy();
    });
  });
});
