/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  VisOptionsProps,
  BasicOptions,
  SelectOption,
  SwitchOption,
  RangeOption,
} from '../../../vis_default_editor/public';
import { WmsOptions } from '../../../maps_legacy/public';
import { TileMapVisParams } from '../types';
import { MapTypes } from '../utils/map_types';

export type TileMapOptionsProps = VisOptionsProps<TileMapVisParams>;

function TileMapOptions(props: TileMapOptionsProps) {
  const { stateParams, setValue, vis } = props;

  useEffect(() => {
    if (!stateParams.mapType) {
      setValue('mapType', vis.type.editorConfig.collections.mapTypes[0]);
    }
  }, [setValue, stateParams.mapType, vis.type.editorConfig.collections.mapTypes]);

  return (
    <>
      <EuiPanel paddingSize="s">
        <SelectOption
          label={i18n.translate('tileMap.visParams.mapTypeLabel', {
            defaultMessage: 'Map type',
          })}
          options={vis.type.editorConfig.collections.mapTypes}
          paramName="mapType"
          value={stateParams.mapType}
          setValue={setValue}
        />

        {stateParams.mapType === MapTypes.Heatmap ? (
          <RangeOption
            label={i18n.translate('tileMap.visParams.clusterSizeLabel', {
              defaultMessage: 'Cluster size',
            })}
            max={3}
            min={1}
            paramName="heatClusterSize"
            step={0.1}
            value={stateParams.heatClusterSize}
            setValue={setValue}
          />
        ) : (
          <SelectOption
            label={i18n.translate('tileMap.visParams.colorSchemaLabel', {
              defaultMessage: 'Color schema',
            })}
            options={vis.type.editorConfig.collections.colorSchemas}
            paramName="colorSchema"
            value={stateParams.colorSchema}
            setValue={setValue}
          />
        )}

        <BasicOptions {...props} />

        <SwitchOption
          disabled={!vis.type.visConfig?.canDesaturate}
          label={i18n.translate('tileMap.visParams.desaturateTilesLabel', {
            defaultMessage: 'Desaturate tiles',
          })}
          tooltip={i18n.translate('tileMap.visParams.reduceVibrancyOfTileColorsTip', {
            defaultMessage:
              'Reduce the vibrancy of tile colors. This does not work in any version of Internet Explorer.',
          })}
          paramName="isDesaturated"
          value={stateParams.isDesaturated}
          setValue={setValue}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <WmsOptions {...props} />
    </>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TileMapOptions as default };
