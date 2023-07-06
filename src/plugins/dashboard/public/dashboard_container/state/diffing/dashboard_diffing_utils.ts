/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty, xor } from 'lodash';
import moment, { Moment } from 'moment';
import fastIsEqual from 'fast-deep-equal';

import { DashboardPanelMap } from '../../../../common';

const convertTimeToUTCString = (time?: string | Moment): undefined | string => {
  if (moment(time).isValid()) {
    return moment(time).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } else {
    // If it's not a valid moment date, then it should be a string representing a relative time
    // like 'now' or 'now-15m'.
    return time as string;
  }
};

export const areTimesEqual = (
  timeA?: string | Moment | undefined,
  timeB?: string | Moment | undefined
) => {
  return convertTimeToUTCString(timeA) === convertTimeToUTCString(timeB);
};

export const defaultDiffFunction = (a: unknown, b: unknown) => fastIsEqual(a, b);

/**
 * Checks whether the panel maps have the same keys, and if they do, whether all of the other keys inside each panel
 * are equal. Skips explicit input as that needs to be handled asynchronously.
 */
export const getPanelLayoutsAreEqual = (
  originalPanels: DashboardPanelMap,
  newPanels: DashboardPanelMap
) => {
  const originalEmbeddableIds = Object.keys(originalPanels);
  const newEmbeddableIds = Object.keys(newPanels);

  const embeddableIdDiff = xor(originalEmbeddableIds, newEmbeddableIds);
  if (embeddableIdDiff.length > 0) {
    return false;
  }
  const commonPanelDiff = <T>(originalObj: Partial<T>, newObj: Partial<T>) => {
    const differences: Partial<T> = {};
    const keys = [
      ...new Set([
        ...(Object.keys(originalObj) as Array<keyof T>),
        ...(Object.keys(newObj) as Array<keyof T>),
      ]),
    ];
    for (const key of keys) {
      if (key === undefined) continue;
      if (!defaultDiffFunction(originalObj[key], newObj[key])) differences[key] = newObj[key];
    }
    return differences;
  };

  for (const embeddableId of newEmbeddableIds) {
    const {
      explicitInput: originalExplicitInput,
      panelRefName: panelRefA,
      ...commonPanelDiffOriginal
    } = originalPanels[embeddableId];
    const {
      explicitInput: newExplicitInput,
      panelRefName: panelRefB,
      ...commonPanelDiffNew
    } = newPanels[embeddableId];

    if (!isEmpty(commonPanelDiff(commonPanelDiffOriginal, commonPanelDiffNew))) return false;
  }
  return true;
};
