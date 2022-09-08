/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IFieldSubTypeMulti } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/common';

import { pluginServices } from '../../services';
import { DataControlFieldRegistry, IEditableControlFactory } from '../../types';

const dataControlFieldRegistryCache: { [key: string]: DataControlFieldRegistry } = {};

const doubleLinkFields = (dataView: DataView) => {
  // double link the parent-child relationship specifically for case-sensitivity support for options lists
  const fieldRegistry: DataControlFieldRegistry = {};

  for (const field of dataView.fields.getAll()) {
    if (!fieldRegistry[field.name]) {
      fieldRegistry[field.name] = { field, compatibleControlTypes: [] };
    }
    const parentFieldName = (field.subType as IFieldSubTypeMulti)?.multi?.parent;
    if (parentFieldName) {
      fieldRegistry[field.name].parentFieldName = parentFieldName;

      const parentField = dataView.getFieldByName(parentFieldName);
      if (!fieldRegistry[parentFieldName] && parentField) {
        fieldRegistry[parentFieldName] = { field: parentField, compatibleControlTypes: [] };
      }
      fieldRegistry[parentFieldName].childFieldName = field.name;
    }
  }
  return fieldRegistry;
};

export const loadFieldRegistryFromDataViewId = async (
  dataViewId: string
): Promise<DataControlFieldRegistry> => {
  if (dataControlFieldRegistryCache[dataViewId]) {
    return dataControlFieldRegistryCache[dataViewId];
  }
  const {
    dataViews,
    controls: { getControlTypes, getControlFactory },
  } = pluginServices.getServices();
  const dataView = await dataViews.get(dataViewId);

  const newFieldRegistry: DataControlFieldRegistry = doubleLinkFields(dataView);

  const controlFactories = getControlTypes().map(
    (controlType) => getControlFactory(controlType) as IEditableControlFactory
  );
  dataView.fields.map((dataViewField) => {
    for (const factory of controlFactories) {
      if (factory.isFieldCompatible) {
        factory.isFieldCompatible(newFieldRegistry[dataViewField.name]);
      }
    }

    if (newFieldRegistry[dataViewField.name]?.compatibleControlTypes.length === 0) {
      delete newFieldRegistry[dataViewField.name];
    }
  });
  dataControlFieldRegistryCache[dataViewId] = newFieldRegistry;

  return newFieldRegistry;
};
