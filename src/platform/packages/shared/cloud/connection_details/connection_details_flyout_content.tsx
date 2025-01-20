/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectionDetails } from './connection_details';
import { useConnectionDetailsOpts, useConnectionDetailsService } from './context';
import { Tabs } from './tabs';

export const ConnectionDetailsFlyoutContent: React.FC = () => {
  const ctx = useConnectionDetailsOpts();
  const service = useConnectionDetailsService();

  const header = (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m" data-test-subj="connectionDetailsModalTitle">
        <h2>
          {i18n.translate('cloud.connectionDetails.flyout.title', {
            defaultMessage: 'Connection details',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <p>
          {i18n.translate('cloud.connectionDetails.flyout.subtitle', {
            defaultMessage: 'Connect to the Elasticsearch API by using the following details.',
          })}{' '}
          {!!ctx.links?.learnMore && (
            // Below onClick is used only for telemetry, but `href` is the real
            // semantic action.
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiLink
              external
              href={ctx.links.learnMore}
              target="_blank"
              onClick={() => service.emitTelemetryEvent(['learn_more_clicked'])}
            >
              {i18n.translate('cloud.connectionDetails.learnMoreButtonLabel', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          )}
        </p>
      </EuiText>
      {/* The -25px is as per EUI example: https://eui.elastic.co/#/layout/flyout */}
      <div style={{ marginBottom: '-25px' }}>
        <Tabs />
      </div>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody data-test-subj="connectionDetailsModalBody">
      <ConnectionDetails />
    </EuiFlyoutBody>
  );

  return (
    <>
      {header}
      {body}
    </>
  );
};
