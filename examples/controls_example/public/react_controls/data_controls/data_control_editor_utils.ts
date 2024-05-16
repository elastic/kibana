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
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';
import { i18n } from '@kbn/i18n';

/** This is duplicated from the controls plugin to avoid exporting it */
export const getDataControlFieldRegistry = memoize(
  async (dataView: DataView) => {
    return await loadFieldRegistryFromDataView(dataView);
  },
  (dataView: DataView) => [dataView.id, JSON.stringify(dataView.fields.getAll())].join('|')
);

/** This is duplicated from the controls plugin to avoid exporting it */
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

export const getControlTypeErrorMessage = ({
  fieldSelected,
  controlType,
}: {
  fieldSelected?: boolean;
  controlType?: string;
}) => {
  if (!fieldSelected) {
    return i18n.translate(
      'controls.controlGroup.manageControl.dataSource.controlTypErrorMessage.noField',
      {
        defaultMessage: 'Select a field first.',
      }
    );
  }

  switch (controlType) {
    /**
     * Note that options list controls are currently compatible with every field type; so, there is no
     * need to have a special error message for these.
     */
    case RANGE_SLIDER_CONTROL: {
      return i18n.translate(
        'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.rangeSlider',
        {
          defaultMessage: 'Range sliders are only compatible with number fields.',
        }
      );
    }
    default: {
      /** This shouldn't ever happen - but, adding just in case as a fallback. */
      return i18n.translate(
        'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.default',
        {
          defaultMessage: 'Select a compatible control type.',
        }
      );
    }
  }
};
