/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { BasicOptions, RangeOption, SelectOption, SwitchOption } from '../../../charts/public';
import { WmsOptions, TileMapVisParams, MapTypes } from '../../../maps_legacy/public';

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
          disabled={!vis.type.visConfig.canDesaturate}
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

export { TileMapOptions };
