/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';

import { DataControlFieldRegistry } from '@kbn/controls-plugin/public/types';
import { DataView } from '@kbn/data-views-plugin/common';
import { getAllControlTypes, getControlFactory } from '../control_factory_registry';
import { isDataControlFactory } from './types';

/** TODO: This funciton is duplicated from the controls plugin to avoid exporting it */
export const getDataControlFieldRegistry = memoize(
  async (dataView: DataView) => {
    return await loadFieldRegistryFromDataView(dataView);
  },
  (dataView: DataView) => [dataView.id, JSON.stringify(dataView.fields.getAll())].join('|')
);

/** TODO: This function is duplicated from the controls plugin to avoid exporting it */
const loadFieldRegistryFromDataView = async (
  dataView: DataView
): Promise<DataControlFieldRegistry> => {
  const controlFactories = getAllControlTypes().map((controlType) =>
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
