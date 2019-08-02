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
import { VisOptionsProps, VisOptionsSetValue } from 'ui/vis/editors/default';
import { SelectOption } from '../../../kbn_vislib_vis_types/public/controls/select';
import { SwitchOption } from '../../../kbn_vislib_vis_types/public/controls/switch';
import { WmsInternalOptions, TmsLayer } from './wms_interna_options';

const mapLayerForOption = ({ id }: TmsLayer) => ({ text: id });

function WmsOptions({ serviceSettings, stateParams, setValue, vis }: VisOptionsProps) {
  const { wms } = stateParams;
  const { tmsLayers } = vis.type.editorConfig.collections;
  const [tmsLayerOptions, setTmsLayersOptions] = useState(
    vis.type.editorConfig.collections.tmsLayers.map(mapLayerForOption)
  );

  const setWmsOption: VisOptionsSetValue = (paramName, value) =>
    setValue('wms', {
      ...wms,
      [paramName]: value,
    });

  useEffect(() => {
    serviceSettings
      .getTMSServices()
      .then((services: TmsLayer[]) => {
        const newBaseLayers = [
          ...tmsLayers,
          ...services.filter(service => !tmsLayers.some(({ id }: TmsLayer) => service.id === id)),
        ];

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
      {!wms.enabled && (
        <SelectOption
          label={i18n.translate('tileMap.wmsOptions.layersLabel', {
            defaultMessage: 'Layers',
          })}
          options={tmsLayerOptions}
          paramName="selectedTmsLayer"
          value={wms.selectedTmsLayer && wms.selectedTmsLayer.id}
          setValue={setWmsOption}
        />
      )}

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

      {wms.enabled && <WmsInternalOptions wms={wms} setValue={setWmsOption} />}
    </EuiPanel>
  );
}

export { WmsOptions };
