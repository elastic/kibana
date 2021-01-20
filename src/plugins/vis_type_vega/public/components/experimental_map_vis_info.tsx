/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parse } from 'hjson';
import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Vis } from '../../../visualizations/public';

function ExperimentalMapLayerInfo() {
  const title = (
    <FormattedMessage
      id="visTypeVega.mapView.experimentalMapLayerInfo"
      defaultMessage="Map layer is experimental and is not subject to the support SLA of official GA features.
        For feedback, please create an issue in {githubLink}."
      values={{
        githubLink: (
          <EuiLink
            external
            href="https://github.com/elastic/kibana/issues/new/choose"
            target="_blank"
          >
            GitHub
          </EuiLink>
        ),
      }}
    />
  );

  return (
    <EuiCallOut
      className="hide-for-sharing"
      data-test-subj="experimentalMapLayerInfo"
      size="s"
      title={title}
      iconType="beaker"
    />
  );
}

export const getInfoMessage = (vis: Vis) => {
  if (vis.params.spec) {
    try {
      const spec = parse(vis.params.spec, { legacyRoot: false, keepWsc: true });

      if (spec.config?.kibana?.type === 'map') {
        return <ExperimentalMapLayerInfo />;
      }
    } catch (e) {
      // spec is invalid
    }
  }

  return null;
};
