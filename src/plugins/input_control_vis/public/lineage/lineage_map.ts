/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { ControlParams } from '../editor_utils';

export function getLineageMap(controlParamsList: ControlParams[]) {
  function getControlParamsById(controlId: string) {
    return controlParamsList.find((controlParams) => {
      return controlParams.id === controlId;
    });
  }

  const lineageMap = new Map<string, string[]>();
  controlParamsList.forEach((rootControlParams) => {
    const lineage = [rootControlParams.id];
    const getLineage = (controlParams: ControlParams) => {
      if (
        _.has(controlParams, 'parent') &&
        controlParams.parent !== '' &&
        !lineage.includes(controlParams.parent)
      ) {
        lineage.push(controlParams.parent);
        const parent = getControlParamsById(controlParams.parent);

        if (parent) {
          getLineage(parent);
        }
      }
    };

    getLineage(rootControlParams);
    lineageMap.set(rootControlParams.id, lineage);
  });
  return lineageMap;
}
