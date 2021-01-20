/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  isMapsAvailable: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  visualizationLabel: string;
}

export function LegacyMapDeprecationMessage(props: Props) {
  const getMapsMessage = !props.isMapsAvailable ? (
    <FormattedMessage
      id="maps_legacy.defaultDistributionMessage"
      defaultMessage="To get Maps, upgrade to the {defaultDistribution} of Elasticsearch and Kibana."
      values={{
        defaultDistribution: (
          <EuiLink
            color="accent"
            external
            href="https://www.elastic.co/downloads/kibana"
            target="_blank"
          >
            default distribution
          </EuiLink>
        ),
      }}
    />
  ) : null;

  const button = props.isMapsAvailable ? (
    <div>
      <EuiButton onClick={props.onClick} size="s">
        <FormattedMessage id="maps_legacy.openInMapsButtonLabel" defaultMessage="View in Maps" />
      </EuiButton>
    </div>
  ) : null;

  return (
    <EuiCallOut
      className="hide-for-sharing"
      data-test-subj="deprecatedVisInfo"
      size="s"
      title={i18n.translate('maps_legacy.legacyMapDeprecationTitle', {
        defaultMessage: '{label} will migrate to Maps in 8.0.',
        values: { label: props.visualizationLabel },
      })}
    >
      <p>
        <FormattedMessage
          id="maps_legacy.legacyMapDeprecationMessage"
          defaultMessage="With Maps, you can add multiple layers and indices, plot individual documents, symbolize features from data values, add heatmaps, grids, and clusters, and more. {getMapsMessage}"
          values={{ getMapsMessage }}
        />
      </p>
      {button}
    </EuiCallOut>
  );
}
