/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { MatchedItem } from '../../types';

export const canPreselectTimeField = (indices: MatchedItem[]) => {
  const preselectStatus = indices.reduce(
    (
      { canPreselect, timeFieldName }: { canPreselect: boolean; timeFieldName?: string },
      matchedItem
    ) => {
      const dataStreamItem = matchedItem.item;
      const dataStreamTimestampField = dataStreamItem.timestamp_field;
      const isDataStream = !!dataStreamItem.timestamp_field;
      const timestampFieldMatches =
        timeFieldName === undefined || timeFieldName === dataStreamTimestampField;

      return {
        canPreselect: canPreselect && isDataStream && timestampFieldMatches,
        timeFieldName: dataStreamTimestampField || timeFieldName,
      };
    },
    {
      canPreselect: true,
      timeFieldName: undefined,
    }
  );

  return preselectStatus.canPreselect ? preselectStatus.timeFieldName : undefined;
};

export const combineIndices = (a: MatchedItem[], b: MatchedItem[]): MatchedItem[] => {
  const newIndices = b.filter((idx) => a.every((idxOg) => idxOg.name !== idx.name));
  return [...a, ...newIndices];
};
