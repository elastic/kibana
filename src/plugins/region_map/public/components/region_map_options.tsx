/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiIcon, EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { FileLayerField, VectorLayer, IServiceSettings } from '../../../maps_legacy/public';
import { SelectOption, SwitchOption, NumberInputOption } from '../../../vis_default_editor/public';
import { WmsOptions } from '../../../maps_legacy/public';
import { RegionMapVisParams } from '../region_map_types';

const mapLayerForOption = ({ layerId, name }: VectorLayer) => ({
  text: name,
  value: layerId,
});

const mapFieldForOption = ({ description, name }: FileLayerField) => ({
  text: description,
  value: name,
});

export type RegionMapOptionsProps = {
  getServiceSettings: () => Promise<IServiceSettings>;
} & VisEditorOptionsProps<RegionMapVisParams>;

function RegionMapOptions(props: RegionMapOptionsProps) {
  const { getServiceSettings, stateParams, vis, setValue } = props;
  const { vectorLayers } = vis.type.editorConfig.collections;
  const vectorLayerOptions = useMemo(() => vectorLayers.map(mapLayerForOption), [vectorLayers]);
  const fieldOptions = useMemo(
    () =>
      ((stateParams.selectedLayer && stateParams.selectedLayer.fields) || []).map(
        mapFieldForOption
      ),
    [stateParams.selectedLayer]
  );

  const setEmsHotLink = useCallback(
    async (layer: VectorLayer) => {
      const serviceSettings = await getServiceSettings();
      const emsHotLink = await serviceSettings.getEMSHotLink(layer);
      setValue('emsHotLink', emsHotLink);
    },
    [setValue, getServiceSettings]
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
    [vectorLayers, setEmsHotLink, setValue]
  );

  const setField = useCallback(
    (paramName: 'selectedJoinField', value: FileLayerField['name']) => {
      if (stateParams.selectedLayer) {
        setValue(
          paramName,
          stateParams.selectedLayer.fields.find((f) => f.name === value)
        );
      }
    },
    [setValue, stateParams.selectedLayer]
  );

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
          min={0}
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

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { RegionMapOptions as default };
