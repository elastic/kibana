/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getTitle, ControlParams } from '../editor_utils';

export function getParentCandidates(
  controlParamsList: ControlParams[],
  controlId: string,
  lineageMap: Map<string, string[]>
) {
  return controlParamsList
    .filter((controlParams) => {
      // Ignore controls that do not have index pattern and field set
      if (!controlParams.indexPattern || !controlParams.fieldName) {
        return false;
      }
      // Ignore controls that would create a circular graph
      const lineage = lineageMap.get(controlParams.id);
      if (lineage?.includes(controlId)) {
        return false;
      }
      return true;
    })
    .map((controlParams, controlIndex) => {
      return {
        value: controlParams.id,
        text: getTitle(controlParams, controlIndex),
      };
    });
}
