/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memoize } from 'lodash';

import type { DataView } from '@kbn/data-views-plugin/common';
import { asyncMap } from '@kbn/std';
import { getAllControlTypes, getControlFactory } from '../../control_factory_registry';
import { isDataControlFactory, type DataControlFieldRegistry } from './types';

export const getDataControlFieldRegistry = memoize(
  async (dataView: DataView) => {
    return await loadFieldRegistryFromDataView(dataView);
  },
  (dataView: DataView) => [dataView.id, JSON.stringify(dataView.fields.getAll())].join('|')
);

const loadFieldRegistryFromDataView = async (
  dataView: DataView
): Promise<DataControlFieldRegistry> => {
  const controlFactories = await asyncMap(getAllControlTypes(), async (controlType) =>
    getControlFactory(controlType)
  );
  const fieldRegistry: DataControlFieldRegistry = {};
  return new Promise<DataControlFieldRegistry>((resolve) => {
    for (const field of dataView.fields.getAll()) {
      const compatibleControlTypes = [];
      for (const factory of controlFactories) {
        if (isDataControlFactory(factory) && factory.isFieldCompatible(field)) {
          compatibleControlTypes.push(factory.type);
        }
      }
      if (compatibleControlTypes.length > 0) {
        fieldRegistry[field.name] = { field, compatibleControlTypes };
      }
    }
    resolve(fieldRegistry);
  });
};
