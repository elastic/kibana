/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlsPanels } from '../types';
import { pluginServices } from '../../services';
import { getDataControlFieldRegistry } from '../editor/data_control_editor_tools';

export const getNextPanelOrder = (panels?: ControlsPanels) => {
  let nextOrder = 0;
  if (Object.keys(panels ?? {}).length > 0) {
    nextOrder =
      Object.values(panels ?? {}).reduce((highestSoFar, panel) => {
        if (panel.order > highestSoFar) highestSoFar = panel.order;
        return highestSoFar;
      }, 0) + 1;
  }
  return nextOrder;
};

export const getCompatibleControlType = async ({
  dataViewId,
  fieldName,
}: {
  dataViewId: string;
  fieldName: string;
}) => {
  const dataView = await pluginServices.getServices().dataViews.get(dataViewId);
  const fieldRegistry = await getDataControlFieldRegistry(dataView);
  const field = fieldRegistry[fieldName];
  return field.compatibleControlTypes[0];
};
