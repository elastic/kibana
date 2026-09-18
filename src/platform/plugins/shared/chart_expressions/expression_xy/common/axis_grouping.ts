/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@elastic/charts';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

export const LEFT_AXIS_GROUP_ID = 'left';
export const RIGHT_AXIS_GROUP_ID = 'right';

export interface AxisSeriesDescriptor {
  layerId: string;
  accessor: string;
  fieldFormat: SerializedFieldFormat;
  requestedGroupId: string;
  requestedGroupPosition?: Position;
}

export type GroupedAxisSeries<T extends AxisSeriesDescriptor = AxisSeriesDescriptor> = Record<
  string,
  T[]
>;

const isFormatterCompatible = (
  first: SerializedFieldFormat,
  second: SerializedFieldFormat
): boolean => first?.id === second?.id;

const acceptsFormatter = (
  series: AxisSeriesDescriptor[],
  currentSeries: AxisSeriesDescriptor
): boolean =>
  series.every(({ fieldFormat }) => isFormatterCompatible(fieldFormat, currentSeries.fieldFormat));

export const groupAxisSeries = <T extends AxisSeriesDescriptor>(
  descriptors: T[],
  hasTables: boolean
): GroupedAxisSeries<T> => {
  const groups: GroupedAxisSeries<T> = {
    auto: [],
    [LEFT_AXIS_GROUP_ID]: [],
    [RIGHT_AXIS_GROUP_ID]: [],
  };
  const leftGroupIds: string[] = [];
  const rightGroupIds: string[] = [];

  descriptors.forEach((descriptor) => {
    groups[descriptor.requestedGroupId] ??= [];
    groups[descriptor.requestedGroupId].push(descriptor);
    if (descriptor.requestedGroupPosition === Position.Left) {
      leftGroupIds.push(descriptor.requestedGroupId);
    } else if (descriptor.requestedGroupPosition === Position.Right) {
      rightGroupIds.push(descriptor.requestedGroupId);
    }
  });

  if (!leftGroupIds.length) {
    leftGroupIds.push(LEFT_AXIS_GROUP_ID);
  }
  if (!rightGroupIds.length) {
    rightGroupIds.push(RIGHT_AXIS_GROUP_ID);
  }

  groups.auto.forEach((currentSeries) => {
    const leftGroupId = hasTables
      ? leftGroupIds.find((groupId) => acceptsFormatter(groups[groupId], currentSeries))
      : undefined;
    const rightGroupId = hasTables
      ? rightGroupIds.find((groupId) => acceptsFormatter(groups[groupId], currentSeries))
      : undefined;
    const rightSeriesCount = rightGroupIds.reduce(
      (count, groupId) => count + groups[groupId].length,
      0
    );
    const leftSeriesCount = leftGroupIds.reduce(
      (count, groupId) => count + groups[groupId].length,
      0
    );

    if (leftSeriesCount === 0 || leftGroupId) {
      groups[leftGroupId ?? leftGroupIds[0]].push(currentSeries);
    } else if (rightSeriesCount === 0 || rightGroupId) {
      groups[rightGroupId ?? rightGroupIds[0]].push(currentSeries);
    } else if (rightSeriesCount >= leftSeriesCount) {
      groups[leftGroupIds[0]].push(currentSeries);
    } else {
      groups[rightGroupIds[0]].push(currentSeries);
    }
  });

  return groups;
};
