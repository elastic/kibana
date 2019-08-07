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
import { FileLayer } from 'ui/vis/map/service_settings';
import { VisOptionsSetValue } from 'ui/vis/editors/default';
import { ExtendedVisOptionsProps } from '../../../kbn_vislib_vis_types/public/utils/with_injected_dependencies';
import { SelectOption } from '../../../kbn_vislib_vis_types/public/controls/select';
import { ORIGIN } from '../../../tile_map/common/origin';
import { mapToLayerWithId, ExtendedFileLayer } from '../util';

const mapLayerForOption = ({ layerId, name }: ExtendedFileLayer) => ({
  text: name,
  value: layerId,
});

function RegionMapOptions(props: ExtendedVisOptionsProps) {
  const { serviceSettings, stateParams, setValue, regionmapsConfig, vis } = props;
  const [vectorLayers, setVectorLayers] = useState(vis.type.editorConfig.collections.vectorLayers);
  const [vectorLayerOptions, setVectorLayerOptions] = useState(vectorLayers.map(mapLayerForOption));

  useEffect(() => {
    async function onLayerChange() {
      if (!stateParams.selectedLayer) {
        return;
      }

      setValue('selectedJoinField', stateParams.selectedLayer.fields[0]);
      setValue('emsHotLink', null);

      if (stateParams.selectedLayer.isEMS) {
        const emsHotLink = await serviceSettings.getEMSHotLink(stateParams.selectedLayer);
        setValue('emsHotLink', emsHotLink);
      }
    }

    onLayerChange();
  }, [stateParams.selectedLayer]);

  useEffect(() => {
    if (regionmapsConfig.includeElasticMapsService) {
      serviceSettings
        .getFileLayers()
        .then(layers => {
          const newLayers = layers
            .map(mapToLayerWithId.bind(null, ORIGIN.EMS))
            .filter(
              layer =>
                !vectorLayers.some(
                  (vectorLayer: FileLayer) => vectorLayer.layerId === layer.layerId
                )
            );

          newLayers.forEach(layer => {
            if (layer.format === 'geojson') {
              layer.format = {
                type: 'geojson',
              };
            }
          });

          const newVectorLayers = [...vectorLayers, ...newLayers];

          setVectorLayers(newVectorLayers);
          setVectorLayerOptions(newVectorLayers.map(mapLayerForOption));

          if (newVectorLayers[0] && !stateParams.selectedLayer) {
            setValue('selectedLayer', newVectorLayers[0]);
          }
        })
        .catch((error: Error) => toastNotifications.addWarning(error.message));
    }
  }, []);

  const setLayer: VisOptionsSetValue = (paramName, value) => {
    setValue(paramName, vectorLayers.find(({ layerId }: ExtendedFileLayer) => layerId === value));
  };

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="regionMap.visParams.layerSettingsTitle"
            defaultMessage="Layer settings"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SelectOption
        label={i18n.translate('regionMap.visParams.vectorMapLabel', {
          defaultMessage: 'Vector map',
        })}
        options={vectorLayerOptions}
        paramName="selectedLayer"
        value={stateParams.selectedLayer && stateParams.selectedLayer.layerId}
        setValue={setLayer}
      />
    </EuiPanel>
  );
}

export { RegionMapOptions };
