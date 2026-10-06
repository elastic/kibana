/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensTagCloudState } from '@kbn/lens-common';

import type { LensAttributes } from '../../../../types';
import type { NormalizerConfig } from './normalize';
import { mergeNormalizers } from './normalize';
import type { IdRemapping } from './common';
import { DEFAULT_LAYER_ID, getColorMappingNormalizer, getCommonNormalizer } from './common';

type TagcloudAttributes = Extract<LensAttributes, { visualizationType: 'lnsTagcloud' }>;

function getColumnRemapping({ valueAccessor, tagAccessor }: LensTagCloudState): IdRemapping {
  return [
    [valueAccessor, 'tagcloud_accessor_metric'],
    [tagAccessor, 'tagcloud_accessor_tag'],
  ];
}

const alignId: NormalizerConfig<TagcloudAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;
    const columnRemapping = getColumnRemapping(viz);
    const idMap = Object.fromEntries(
      columnRemapping.filter((pair): pair is [string, string] => pair[0] != null)
    );

    viz.layerId = DEFAULT_LAYER_ID;

    if (viz.valueAccessor) {
      viz.valueAccessor = idMap[viz.valueAccessor];
    }
    if (viz.tagAccessor) {
      viz.tagAccessor = idMap[viz.tagAccessor];
    }
    return attributes;
  },
};

const alignLegacyTypes: NormalizerConfig<TagcloudAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;

    // layerType is not part of the tagcloud state types.
    // Check x-pack/platform/plugins/shared/lens/public/visualizations/tagcloud/tagcloud_visualization.tsx
    // - initialize has always set it to LayerTypes.DATA and
    // - getLayerType hardcodes return LayerTypes.DATA ignoring any persisted layerType field entirely
    if ('layerType' in viz) delete viz.layerType;
    return attributes;
  },
};

export const normalizeTagcloud = mergeNormalizers<TagcloudAttributes>([
  getCommonNormalizer<TagcloudAttributes>(({ state: { visualization } }) => ({
    layerRemapping: [[visualization.layerId, DEFAULT_LAYER_ID]],
    columnRemapping: getColumnRemapping(visualization),
  })),
  alignId,
  alignLegacyTypes,
  getColorMappingNormalizer<TagcloudAttributes>('state.visualization.colorMapping'),
]);
