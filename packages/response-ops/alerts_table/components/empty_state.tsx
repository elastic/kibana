/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiImage, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EsQuerySnapshot } from '@kbn/alerting-types';
import icon from '../assets/illustration_product_no_results_magnifying_glass.svg';
import { AlertsQueryInspector } from './alerts_query_inspector';
import { ALERTS_TABLE_TITLE } from '../translations';

const heights = {
  tall: 490,
  short: 250,
};

const panelStyle = {
  maxWidth: 500,
};

export const EmptyState: React.FC<{
  height?: keyof typeof heights;
  additionalToolbarControls?: ReactNode;
  alertsQuerySnapshot?: EsQuerySnapshot;
  showInspectButton?: boolean;
}> = ({ height = 'tall', additionalToolbarControls, alertsQuerySnapshot, showInspectButton }) => {
  return (
    <EuiPanel color="subdued" data-test-subj="alertsTableEmptyState">
      <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd">
        {alertsQuerySnapshot && showInspectButton && (
          <EuiFlexItem grow={false}>
            <AlertsQueryInspector
              alertsQuerySnapshot={alertsQuerySnapshot}
              inspectTitle={ALERTS_TABLE_TITLE}
            />
          </EuiFlexItem>
        )}
        {additionalToolbarControls && (
          <EuiFlexItem grow={false}>{additionalToolbarControls}</EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFlexGroup style={{ height: heights[height] }} alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={true} style={panelStyle}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTitle>
                    <h3>
                      <FormattedMessage
                        id="xpack.triggersActionsUI.empty.title"
                        defaultMessage="No results match your search criteria"
                      />
                    </h3>
                  </EuiTitle>
                  <p>
                    <FormattedMessage
                      id="xpack.triggersActionsUI.empty.description"
                      defaultMessage="Try searching over a longer period of time or modifying your search"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiImage style={{ width: 200, height: 148 }} size="200" alt="" url={icon} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
