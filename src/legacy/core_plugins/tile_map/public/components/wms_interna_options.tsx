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

import React from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsSetValue } from 'ui/vis/editors/default';
import { TextInputOption } from '../../../kbn_vislib_vis_types/public/controls/text_input';

export interface TmsLayer {
  id: string;
  origin: string;
  minZoom: string;
  maxZoom: number;
  attribution: string;
}

interface WmsOptions {
  enabled: boolean;
  url: string;
  selectedTmsLayer: TmsLayer;
  options: {
    attribution: string;
    format: string;
    layers: string;
    styles: string;
    version: string;
  };
}

interface WmsInternalOptions {
  wms: WmsOptions;
  setValue: VisOptionsSetValue;
}

function WmsInternalOptions({ wms, setValue }: WmsInternalOptions) {
  const wmsLink = (
    <EuiLink href="http://www.opengeospatial.org/standards/wms" target="_blank">
      <FormattedMessage id="tileMap.wmsOptions.wmsLinkText" defaultMessage="here" />
    </EuiLink>
  );

  const setOptions: VisOptionsSetValue = (paramName, value) =>
    setValue('options', {
      ...wms.options,
      [paramName]: value,
    });

  return (
    <>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <FormattedMessage
          id="tileMap.wmsOptions.wmsDescription"
          defaultMessage="WMS is an OGC standard for map image services. For more information, go {wmsLink}."
          values={{ wmsLink }}
        />
      </EuiText>
      <EuiSpacer size="s" />

      <TextInputOption
        label={<FormattedMessage id="tileMap.wmsOptions.wmsUrlLabel" defaultMessage="WMS url*" />}
        tip={
          <FormattedMessage
            id="tileMap.wmsOptions.urlOfWMSWebServiceTip"
            defaultMessage="The URL of the WMS web service"
          />
        }
        paramName="url"
        value={wms.url}
        setValue={setValue}
      />

      <TextInputOption
        label={
          <FormattedMessage id="tileMap.wmsOptions.wmsLayersLabel" defaultMessage="WMS layers*" />
        }
        tip={
          <FormattedMessage
            id="tileMap.wmsOptions.listOfLayersToUseTip"
            defaultMessage="A comma separated list of layers to use"
          />
        }
        paramName="layers"
        value={wms.options.layers}
        setValue={setOptions}
      />

      <TextInputOption
        label={
          <FormattedMessage id="tileMap.wmsOptions.wmsVersionLabel" defaultMessage="WMS version*" />
        }
        tip={
          <FormattedMessage
            id="tileMap.wmsOptions.versionOfWMSserverSupportsTip"
            defaultMessage="The version of WMS the server supports"
          />
        }
        paramName="version"
        value={wms.options.version}
        setValue={setOptions}
      />

      <TextInputOption
        label={
          <FormattedMessage id="tileMap.wmsOptions.wmsFormatLabel" defaultMessage="WMS format*" />
        }
        tip={
          <FormattedMessage
            id="tileMap.wmsOptions.imageFormatToUseTip"
            defaultMessage="Usually image/png or image/jpeg. Use png if the server will return transparent layers."
          />
        }
        paramName="format"
        value={wms.options.format}
        setValue={setOptions}
      />

      <TextInputOption
        label={
          <FormattedMessage
            id="tileMap.wmsOptions.wmsAttributionLabel"
            defaultMessage="WMS attribution"
          />
        }
        tip={
          <FormattedMessage
            id="tileMap.wmsOptions.attributionStringTip"
            defaultMessage="Attribution string for the lower right corner"
          />
        }
        paramName="attribution"
        value={wms.options.attribution}
        setValue={setOptions}
      />

      <TextInputOption
        label={
          <FormattedMessage id="tileMap.wmsOptions.wmsStylesLabel" defaultMessage="WMS styles*" />
        }
        tip={
          <FormattedMessage
            id="tileMap.wmsOptions.wmsServerSupportedStylesListTip"
            defaultMessage="A comma separated list of WMS server supported styles to use. Blank in most cases."
          />
        }
        paramName="styles"
        value={wms.options.styles}
        setValue={setOptions}
      />

      <EuiText size="s">
        <FormattedMessage
          id="tileMap.wmsOptions.mapLoadFailDescription"
          defaultMessage="* if this parameter is incorrect, maps will fail to load."
        />
      </EuiText>
    </>
  );
}

export { WmsInternalOptions };
