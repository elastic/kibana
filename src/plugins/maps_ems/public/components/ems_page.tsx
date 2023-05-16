/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { RouteComponentProps } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiLink,
  EuiRadioGroup,
  EuiRadioGroupOption,
} from '@elastic/eui';
import { FileLayer, TMSService } from '@elastic/ems-client';
import { FeatureCollection } from 'geojson';
import { DEFAULT_EMS_ROADMAP_DESATURATED_ID } from '../../common';
import { EmsMap } from './ems_map';
// import { EmsFeatureTable } from './ems_feature_table';

interface EMSServices {
  tmsServices?: TMSService[];
  fileLayers?: FileLayer[];
}

function EmsBody({
  emsServices,
  basemapId,
  layerId,
}: {
  emsServices?: EMSServices;
  basemapId?: string;
  layerId?: string;
}) {
  const [selectedBasemapId, setSelectedBasemapId] = useState<string>(
    DEFAULT_EMS_ROADMAP_DESATURATED_ID
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | undefined>();
  const [basemapOptions, setBasemapOptions] = useState<EuiRadioGroupOption[]>([]);
  const [layerOptions, setLayerOptions] = useState<EuiComboBoxOptionOption[]>([]);

  const { loading, value } = useAsync(async () => {
    if (!emsServices) return;

    const { tmsServices, fileLayers } = emsServices;

    if (layerId && fileLayers) {
      const layer = fileLayers.find((fileLayer) => fileLayer.hasId(layerId));
      setSelectedLayerId(layer?.getId());
    }

    if (tmsServices) {
      const options = tmsServices.map((tmsService) => {
        return {
          id: tmsService.getId(),
          label: tmsService.getDisplayName(),
        };
      });
      setBasemapOptions(options);
      handleBasemapChange(selectedBasemapId);
    }

    if (fileLayers) {
      const options = fileLayers.map((fileLayer) => {
        return {
          key: fileLayer.getId(),
          label: fileLayer.getDisplayName(),
        };
      });
      setLayerOptions(options);
      handleLayerChange(options.filter((option) => option.key === selectedLayerId));
    }

    const basemapService = tmsServices?.find((tmsService) => tmsService.hasId(selectedBasemapId));
    const selectedStyle = await basemapService?.getId();
    let selectedFeatures: FeatureCollection | undefined;
    // if (selectedLayerId) {
    //   const fileService = fileLayers?.find((fileLayer) => fileLayer.hasId(selectedLayerId));
    //   selectedFeatures = await fileService?.getGeoJson();
    // }
    return { selectedStyle, selectedFeatures };
  }, [emsServices, selectedBasemapId, selectedLayerId]);

  function handleBasemapChange(selectedId: string) {
    if (!emsServices?.tmsServices) return;
    const basemap = emsServices.tmsServices.find((tmsService) => tmsService.hasId(selectedId));
    if (basemap) setSelectedBasemapId(basemap.getId());
  }

  function handleLayerChange(selectedOptions: EuiComboBoxOptionOption[]) {
    if (!emsServices?.fileLayers || !selectedOptions.length) {
      setSelectedLayerId('');
      return;
    }
    const layer = emsServices.fileLayers.find((fileLayer) =>
      fileLayer.hasId(selectedOptions[0].key!)
    );
    if (layer) setSelectedLayerId(layer.getId());
  }

  return (
    <>
      <KibanaPageTemplate.Section>
        <EuiForm>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiDescribedFormGroup
                title={<h3>Basemap style</h3>}
                description={<p>Choose one of the styles for the basemap.</p>}
              >
                <EuiRadioGroup
                  compressed
                  options={basemapOptions}
                  idSelected={selectedBasemapId}
                  onChange={handleBasemapChange}
                  name="basemapSelector"
                />
              </EuiDescribedFormGroup>
              <EuiDescribedFormGroup
                title={<h3>Boundaries layer</h3>}
                description={<p>Choose one of the boundary layers to display on the map.</p>}
              >
                <EuiComboBox
                  compressed
                  options={layerOptions}
                  isClearable
                  singleSelection={{ asPlainText: true }}
                  selectedOptions={layerOptions.filter((option) => option.key === selectedLayerId)}
                  onChange={handleLayerChange}
                />
              </EuiDescribedFormGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section>
        <EmsMap
          loading={loading}
          styleId={value?.selectedStyle}
          features={value?.selectedFeatures}
        />
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section>{/* <EmsFeatureTable /> */}</KibanaPageTemplate.Section>
    </>
  );
}

export function EmsPage(routeProps: RouteComponentProps<{ basemapId?: string; layerId?: string }>) {
  const { basemapId, layerId } = routeProps.match.params;
  const {
    services: { emsClient },
  } = useKibana();

  const { loading, value: emsServices } = useAsync(async () => {
    const tmsServices = (await emsClient.getTMSServices()) as TMSService[];
    const fileLayers = (await emsClient.getFileLayers()) as FileLayer[];
    return { tmsServices, fileLayers };
  }, [emsClient]);

  return (
    <KibanaPageTemplate>
      {loading ? (
        <KibanaPageTemplate.EmptyPrompt title={<h2>Loading...</h2>} />
      ) : (
        <>
          <KibanaPageTemplate.Header
            iconType="emsApp"
            pageTitle="Elastic Maps Service"
            description={
              <p>
                Reference maps and boundaries from the Elastic Maps Service. For more information,
                see our{' '}
                <EuiLink external href="https://www.elastic.co/elastic-maps-service-terms">
                  Terms of Service.
                </EuiLink>
              </p>
            }
          />
          <EmsBody emsServices={emsServices} basemapId={basemapId} layerId={layerId} />
        </>
      )}
    </KibanaPageTemplate>
  );
}
