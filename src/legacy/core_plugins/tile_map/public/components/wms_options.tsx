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

import React, { useEffect, useState } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { toastNotifications } from 'ui/notify';
import { TmsLayer } from 'ui/vis/map/service_settings';
import { SelectOption } from '../../../kbn_vislib_vis_types/public/controls/select';
import { SwitchOption } from '../../../kbn_vislib_vis_types/public/controls/switch';
import { WmsInternalOptions } from './wms_internal_options';
import { TileMapOptionsProps } from './tile_map_options';
import { TileMapVisParams } from '../types';

const mapLayerForOption = ({ id }: TmsLayer) => ({ text: id, value: id });

function WmsOptions({ serviceSettings, stateParams, setValue, vis }: TileMapOptionsProps) {
  const { wms } = stateParams;
  const { tmsLayers } = vis.type.editorConfig.collections;
  const [tmsLayerOptions, setTmsLayersOptions] = useState<Array<{ text: string; value: string }>>(
    vis.type.editorConfig.collections.tmsLayers.map(mapLayerForOption)
  );
  const [layers, setLayers] = useState<TmsLayer[]>([]);

  const setWmsOption = <T extends keyof TileMapVisParams['wms']>(
    paramName: T,
    value: TileMapVisParams['wms'][T]
  ) =>
    setValue('wms', {
      ...wms,
      [paramName]: value,
    });

  const selectTmsLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (layer) {
      setWmsOption('selectedTmsLayer', layer);
    }
  };

  useEffect(() => {
    serviceSettings
      .getTMSServices()
      .then(services => {
        const newBaseLayers = [
          ...tmsLayers,
          ...services.filter(service => !tmsLayers.some(({ id }: TmsLayer) => service.id === id)),
        ];

        setLayers(newBaseLayers);
        setTmsLayersOptions(newBaseLayers.map(mapLayerForOption));

        if (!wms.selectedTmsLayer && newBaseLayers.length) {
          setWmsOption('selectedTmsLayer', newBaseLayers[0]);
        }
      })
      .catch((error: Error) => toastNotifications.addWarning(error.message));
  }, []);

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <div>
          <FormattedMessage
            id="tileMap.wmsOptions.baseLayerSettingsTitle"
            defaultMessage="Base layer settings"
          />
        </div>
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
