/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';

import { DataView } from '@kbn/data-views-plugin/common';

import { pluginServices } from '../../services';
import { DataControlField, DataControlFieldRegistry, IEditableControlFactory } from '../../types';

export const getDataControlFieldRegistry = memoize(
  async (dataView: DataView) => {
    return await loadFieldRegistryFromDataView(dataView);
  },
  (dataView: DataView) => [dataView.id, JSON.stringify(dataView.fields.getAll())].join('|')
);

const loadFieldRegistryFromDataView = async (
  dataView: DataView
): Promise<DataControlFieldRegistry> => {
  const {
    controls: { getControlTypes, getControlFactory },
  } = pluginServices.getServices();

  const controlFactories = getControlTypes().map(
    (controlType) => getControlFactory(controlType) as IEditableControlFactory
  );
  const fieldRegistry: DataControlFieldRegistry = dataView.fields
    .getAll()
    .reduce((registry, field) => {
      const test: DataControlField = { field, compatibleControlTypes: [] };
      for (const factory of controlFactories) {
        if (factory.isFieldCompatible) {
          factory.isFieldCompatible(test);
        }
      }
      if (test.compatibleControlTypes.length === 0) {
        return { ...registry };
      }
      return { ...registry, [field.name]: test };
    }, {});

  return fieldRegistry;
};
