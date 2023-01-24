/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './reference_lines.scss';

import React from 'react';
import { Position } from '@elastic/charts';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { CommonXYReferenceLineLayerConfig, ReferenceLineConfig } from '../../../common/types';
import {
  AxesMap,
  GroupsConfiguration,
  isReferenceLine,
  LayersAccessorsTitles,
} from '../../helpers';
import { ReferenceLineLayer } from './reference_line_layer';
import { ReferenceLine } from './reference_line';
import { getNextValuesForReferenceLines } from './utils';

export interface ReferenceLinesProps {
  layers: CommonXYReferenceLineLayerConfig[];
  xAxisFormatter: FieldFormat;
  axesConfiguration: GroupsConfiguration;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
  titles?: LayersAccessorsTitles;
  yAxesMap: AxesMap;
}

export const ReferenceLines = ({ layers, titles = {}, ...rest }: ReferenceLinesProps) => {
  const referenceLines = layers.filter((layer): layer is ReferenceLineConfig =>
    isReferenceLine(layer)
  );

  const referenceLinesNextValues = getNextValuesForReferenceLines(referenceLines);

  return (
    <>
      {layers.flatMap((layer) => {
        if (!layer.decorations) {
          return null;
        }

        const key = `referenceLine-${layer.layerId}`;
        if (isReferenceLine(layer)) {
          const nextValue = referenceLinesNextValues[layer.decorations[0].fill][layer.layerId];
          return <ReferenceLine key={key} layer={layer} {...rest} nextValue={nextValue} />;
        }

        const layerTitles = titles[layer.layerId];
        return <ReferenceLineLayer key={key} layer={layer} {...rest} titles={layerTitles} />;
      })}
    </>
  );
};
