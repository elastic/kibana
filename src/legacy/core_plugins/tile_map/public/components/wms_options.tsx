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

import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { TmsLayer } from 'ui/vis/map/service_settings';
import { Vis } from 'ui/vis';
import { RegionMapVisParams } from '../../../region_map/public/types';
import { SelectOption, SwitchOption } from '../../../kbn_vislib_vis_types/public/components';
import { WmsInternalOptions } from './wms_internal_options';
import { WMSOptions, TileMapVisParams } from '../types';

interface Props {
  stateParams: TileMapVisParams | RegionMapVisParams;
  setValue: (title: 'wms', options: WMSOptions) => void;
  vis: Vis;
}

const mapLayerForOption = ({ id }: TmsLayer) => ({ text: id, value: id });

function WmsOptions({ stateParams, setValue, vis }: Props) {
  const { wms } = stateParams;
  const { tmsLayers } = vis.type.editorConfig.collections;
  const tmsLayerOptions = useMemo(() => tmsLayers.map(mapLayerForOption), [tmsLayers]);

  const setWmsOption = <T extends keyof WMSOptions>(paramName: T, value: WMSOptions[T]) =>
    setValue('wms', {
      ...wms,
      [paramName]: value,
    });

  const selectTmsLayer = (id: string) => {
    const layer = tmsLayers.find((l: TmsLayer) => l.id === id);
    if (layer) {
      setWmsOption('selectedTmsLayer', layer);
    }
  };

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="tileMap.wmsOptions.baseLayerSettingsTitle"
            defaultMessage="Base layer settings"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('tileMap.wmsOptions.wmsMapServerLabel', {
          defaultMessage: 'WMS map server',
        })}
        tooltip={i18n.translate('tileMap.wmsOptions.useWMSCompliantMapTileServerTip', {
          defaultMessage: 'Use WMS compliant map tile server. For advanced users only.',
        })}
        paramName="enabled"
        value={wms.enabled}
        setValue={setWmsOption}
      />

      {!wms.enabled && (
        <>
          <EuiSpacer size="s" />
          <SelectOption
            id="wmsOptionsSelectTmsLayer"
            label={i18n.translate('tileMap.wmsOptions.layersLabel', {
              defaultMessage: 'Layers',
            })}
            options={tmsLayerOptions}
            paramName="selectedTmsLayer"
            value={wms.selectedTmsLayer && wms.selectedTmsLayer.id}
            setValue={(param, value) => selectTmsLayer(value)}
          />
        </>
      )}

      {wms.enabled && <WmsInternalOptions wms={wms} setValue={setWmsOption} />}
    </EuiPanel>
  );
}

export { WmsOptions };
