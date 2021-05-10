/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import {
  BasicOptions,
  SelectOption,
  SwitchOption,
  RangeOption,
} from '../../../vis_default_editor/public';
import { truncatedColorSchemas } from '../../../charts/public';
import { WmsOptions } from '../../../maps_legacy/public';
import { TileMapVisParams } from '../types';
import { MapTypes } from '../utils/map_types';
import { getTmsLayers } from '../services';
import { collections } from './collections';

export type TileMapOptionsProps = VisEditorOptionsProps<TileMapVisParams>;

const tmsLayers = getTmsLayers();

function TileMapOptions(props: TileMapOptionsProps) {
  const { stateParams, setValue, vis } = props;

  useEffect(() => {
    if (!stateParams.mapType) {
      setValue('mapType', collections.mapTypes[0].value);
    }
  }, [setValue, stateParams.mapType]);

  return (
    <>
      <EuiPanel paddingSize="s">
        <SelectOption
          label={i18n.translate('tileMap.visParams.mapTypeLabel', {
            defaultMessage: 'Map type',
          })}
          options={collections.mapTypes}
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
            options={truncatedColorSchemas}
            paramName="colorSchema"
            value={stateParams.colorSchema}
            setValue={setValue}
          />
        )}

        <BasicOptions {...props} legendPositions={collections.legendPositions} />

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

      <WmsOptions setValue={setValue} stateParams={stateParams} tmsLayers={tmsLayers} />
    </>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TileMapOptions as default };
