/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { TmsLayer } from '../index';
import { Vis } from '../../../visualizations/public';
import { RegionMapVisParams } from '../common/types/region_map_types';
import { SelectOption, SwitchOption } from '../../../charts/public';
import { WmsInternalOptions } from './wms_internal_options';
import { WMSOptions, TileMapVisParams } from '../common/types/external_basemap_types';

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
