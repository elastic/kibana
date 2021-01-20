/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { toMountPoint } from '../../../kibana_react/public';

export const createZoomWarningMsg = (function () {
  let disableZoomMsg = false;
  const setZoomMsg = (boolDisableMsg) => (disableZoomMsg = boolDisableMsg);

  class ZoomWarning extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        disabled: false,
      };
    }

    render() {
      return (
        <div>
          <p>
            <FormattedMessage
              id="maps_legacy.kibanaMap.zoomWarning"
              defaultMessage="You've reached the maximum number of zoom
              levels. To zoom all the way in, upgrade to the
              {defaultDistribution} of Elasticsearch and Kibana. You'll get
              access to additional zoom levels for free through the {ems}.
              Or, you can configure your own map server. Please go to
              { wms } or { configSettings} for more information."
              values={{
                defaultDistribution: (
                  <a target="_blank" href="https://www.elastic.co/downloads/kibana">
                    {`default distribution `}
                  </a>
                ),
                ems: (
                  <a target="_blank" href="https://www.elastic.co/elastic-maps-service">
                    {`Elastic Maps Service`}
                  </a>
                ),
                wms: (
                  <a
                    target="_blank"
                    href="https://www.elastic.co/guide/en/kibana/current/tilemap.html"
                  >
                    {`Custom WMS Configuration`}
                  </a>
                ),
                configSettings: (
                  <a
                    target="_blank"
                    href="https://www.elastic.co/guide/en/kibana/current/settings.html"
                  >
                    {`Custom TMS Using Config Settings`}
                  </a>
                ),
              }}
            />
          </p>
          <EuiSpacer size="xs" />
          <EuiButtonEmpty
            size="s"
            flush="left"
            isDisabled={this.state.disabled}
            onClick={() => {
              this.setState(
                {
                  disabled: true,
                },
                () => this.props.onChange(this.state.disabled)
              );
            }}
            data-test-subj="suppressZoomWarnings"
          >
            {`Don't show again`}
          </EuiButtonEmpty>
        </div>
      );
    }
  }

  const zoomToast = {
    title: 'No additional zoom levels',
    text: toMountPoint(<ZoomWarning onChange={setZoomMsg} />),
    'data-test-subj': 'maxZoomWarning',
  };

  return (toastService, getZoomLevel, getMaxZoomLevel) => {
    return () => {
      const zoomLevel = getZoomLevel();
      const maxMapZoom = getMaxZoomLevel();
      if (!disableZoomMsg && zoomLevel === maxMapZoom) {
        toastService.addDanger(zoomToast);
      }
    };
  };
})();
