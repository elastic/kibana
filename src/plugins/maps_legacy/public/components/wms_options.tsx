/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { TmsLayer } from '../index';
import { Vis } from '../../../visualizations/public';
import { SelectOption, SwitchOption } from '../../../vis_default_editor/public';
import { WmsInternalOptions } from './wms_internal_options';
import { WMSOptions } from '../common/types';

interface Props<K> {
  stateParams: K;
  setValue: (title: 'wms', options: WMSOptions) => void;
  vis: Vis;
}

const mapLayerForOption = ({ id }: TmsLayer) => ({ text: id, value: id });

function WmsOptions<K extends { wms: WMSOptions }>({ stateParams, setValue, vis }: Props<K>) {
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
            id="maps_legacy.wmsOptions.baseLayerSettingsTitle"
            defaultMessage="Base layer settings"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('maps_legacy.wmsOptions.wmsMapServerLabel', {
          defaultMessage: 'WMS map server',
        })}
        tooltip={i18n.translate('maps_legacy.wmsOptions.useWMSCompliantMapTileServerTip', {
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
            label={i18n.translate('maps_legacy.wmsOptions.layersLabel', {
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
