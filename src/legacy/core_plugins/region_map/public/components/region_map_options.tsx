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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { EuiIcon, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { toastNotifications } from 'ui/notify';
import { FileLayerField, VectorLayer, ServiceSettings } from 'ui/vis/map/service_settings';
import { VisOptionsProps } from 'ui/vis/editors/default';
import {
  NumberInputOption,
  SelectOption,
  SwitchOption,
} from '../../../kbn_vislib_vis_types/public/components';
import { ORIGIN } from '../../../tile_map/common/origin';
import { WmsOptions } from '../../../tile_map/public/components/wms_options';
import { mapToLayerWithId } from '../util';
import { RegionMapVisParams } from '../types';
import { RegionMapsConfig } from '../plugin';

const mapLayerForOption = ({ layerId, name }: VectorLayer) => ({
  text: name,
  value: layerId,
});

const mapFieldForOption = ({ description, name }: FileLayerField) => ({
  text: description,
  value: name,
});

export type RegionMapOptionsProps = {
  serviceSettings: ServiceSettings;
  includeElasticMapsService: RegionMapsConfig['includeElasticMapsService'];
} & VisOptionsProps<RegionMapVisParams>;

function RegionMapOptions(props: RegionMapOptionsProps) {
  const { includeElasticMapsService, serviceSettings, stateParams, vis, setValue } = props;
  const [vectorLayers, setVectorLayers] = useState<VectorLayer[]>(
    vis.type.editorConfig.collections.vectorLayers
  );
  const [vectorLayerOptions, setVectorLayerOptions] = useState(vectorLayers.map(mapLayerForOption));
  const currentLayerId = stateParams.selectedLayer && stateParams.selectedLayer.layerId;
  const fieldOptions = useMemo(
    () =>
      ((stateParams.selectedLayer && stateParams.selectedLayer.fields) || []).map(
        mapFieldForOption
      ),
    [currentLayerId]
  );

  const setEmsHotLink = useCallback(
    async (layer: VectorLayer) => {
      const emsHotLink = await serviceSettings.getEMSHotLink(layer);
      setValue('emsHotLink', emsHotLink);
    },
    [setValue]
  );

  const setLayer = useCallback(
    async (paramName: 'selectedLayer', value: VectorLayer['layerId']) => {
      const newLayer = vectorLayers.find(({ layerId }: VectorLayer) => layerId === value);

      if (newLayer) {
        setValue(paramName, newLayer);
        setValue('selectedJoinField', newLayer.fields[0]);
        setEmsHotLink(newLayer);
      }
    },
    [vectorLayers, setValue]
  );

  const setField = useCallback(
    (paramName: 'selectedJoinField', value: FileLayerField['name']) => {
      if (stateParams.selectedLayer) {
        setValue(paramName, stateParams.selectedLayer.fields.find(f => f.name === value));
      }
    },
    [currentLayerId, setValue]
  );

  useEffect(() => {
    async function setDefaultValues() {
      try {
        const layers = await serviceSettings.getFileLayers();
        const newLayers = layers
          .map(mapToLayerWithId.bind(null, ORIGIN.EMS))
          .filter(
            layer => !vectorLayers.some(vectorLayer => vectorLayer.layerId === layer.layerId)
          );

        // backfill v1 manifest for now
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

        const [newLayer] = newVectorLayers;

        if (newLayer && !stateParams.selectedLayer) {
          setValue('selectedLayer', newLayer);
          setValue('selectedJoinField', newLayer.fields[0]);

          if (newLayer.isEMS) {
            setEmsHotLink(newLayer);
          }
        }
      } catch (error) {
        toastNotifications.addWarning(error.message);
      }
    }

    if (includeElasticMapsService) {
      setDefaultValues();
    }
  }, []);

  return (
    <>
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
          id="regionMapOptionsSelectLayer"
          label={i18n.translate('regionMap.visParams.vectorMapLabel', {
            defaultMessage: 'Vector map',
          })}
          labelAppend={
            stateParams.emsHotLink && (
              <EuiText size="xs">
                <EuiLink
                  href={stateParams.emsHotLink}
                  target="_blank"
                  title={i18n.translate('regionMap.visParams.previewOnEMSLinkTitle', {
                    defaultMessage: 'Preview {selectedLayerName} on the Elastic Maps Service',
                    values: {
                      selectedLayerName:
                        stateParams.selectedLayer && stateParams.selectedLayer.name,
                    },
                  })}
                >
                  <FormattedMessage
                    id="regionMap.visParams.previewOnEMSLinkText"
                    defaultMessage="Preview on EMS"
                  />{' '}
                  <EuiIcon type="popout" size="s" />
                </EuiLink>
              </EuiText>
            )
          }
          options={vectorLayerOptions}
          paramName="selectedLayer"
          value={stateParams.selectedLayer && stateParams.selectedLayer.layerId}
          setValue={setLayer}
        />

        <SelectOption
          id="regionMapOptionsSelectJoinField"
          label={i18n.translate('regionMap.visParams.joinFieldLabel', {
            defaultMessage: 'Join field',
          })}
          options={fieldOptions}
          paramName="selectedJoinField"
          value={stateParams.selectedJoinField && stateParams.selectedJoinField.name}
          setValue={setField}
        />

        <SwitchOption
          label={i18n.translate('regionMap.visParams.displayWarningsLabel', {
            defaultMessage: 'Display warnings',
          })}
          tooltip={i18n.translate('regionMap.visParams.switchWarningsTipText', {
            defaultMessage:
              'Turns on/off warnings. When turned on, warning will be shown for each term that cannot be matched to a shape in the vector layer based on the join field. When turned off, these warnings will be turned off.',
          })}
          paramName="isDisplayWarning"
          value={stateParams.isDisplayWarning}
          setValue={setValue}
        />

        <SwitchOption
          label={i18n.translate('regionMap.visParams.showAllShapesLabel', {
            defaultMessage: 'Show all shapes',
          })}
          tooltip={i18n.translate('regionMap.visParams.turnOffShowingAllShapesTipText', {
            defaultMessage:
              'Turning this off only shows the shapes that were matched with a corresponding term.',
          })}
          paramName="showAllShapes"
          value={stateParams.showAllShapes}
          setValue={setValue}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="regionMap.visParams.styleSettingsLabel"
              defaultMessage="Style settings"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />

        <SelectOption
          label={i18n.translate('regionMap.visParams.colorSchemaLabel', {
            defaultMessage: 'Color schema',
          })}
          options={vis.type.editorConfig.collections.colorSchemas}
          paramName="colorSchema"
          value={stateParams.colorSchema}
          setValue={setValue}
        />

        <NumberInputOption
          label={i18n.translate('regionMap.visParams.outlineWeightLabel', {
            defaultMessage: 'Border thickness',
          })}
          paramName="outlineWeight"
          value={stateParams.outlineWeight}
          setValue={setValue}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <WmsOptions {...props} />
    </>
  );
}

export { RegionMapOptions };
