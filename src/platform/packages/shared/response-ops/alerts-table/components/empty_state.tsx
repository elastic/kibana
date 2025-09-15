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
import { css } from '@emotion/react';
import icon from '../assets/illustration_product_no_results_magnifying_glass.svg';
import { AlertsQueryInspector } from './alerts_query_inspector';
import { ALERTS_TABLE_TITLE } from '../translations';
import { AlertsTableProps } from '../types';

const heights = {
  tall: 490,
  short: 250,
};

const panelStyle = {
  maxWidth: 500,
};
type EmptyState = NonNullable<AlertsTableProps['emptyState']>;
type EmptyStateMessage = Pick<EmptyState, 'messageTitle' | 'messageBody'>;

export const EmptyState: React.FC<
  {
    height?: keyof typeof heights | 'flex';
    variant?: 'subdued' | 'transparent';
    additionalToolbarControls?: ReactNode;
    alertsQuerySnapshot?: EsQuerySnapshot;
    showInspectButton?: boolean;
  } & EmptyStateMessage
> = ({
  height = 'tall',
  variant = 'subdued',
  messageTitle,
  messageBody,
  additionalToolbarControls,
  alertsQuerySnapshot,
  showInspectButton,
}) => {
  return (
    <EuiPanel color={variant} data-test-subj="alertsTableEmptyState">
      <EuiFlexGroup
        direction="column"
        css={css`
          height: 100%;
        `}
      >
        {(showInspectButton || additionalToolbarControls) && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd">
              {showInspectButton && alertsQuerySnapshot && (
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
          </EuiFlexItem>
        )}

        <EuiFlexItem
          grow={height === 'flex'}
          css={height !== 'flex' ? { height: heights[height] } : undefined}
        >
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder={variant === 'subdued'} css={panelStyle} hasShadow={false}>
                <EuiFlexGroup alignItems={variant === 'transparent' ? 'center' : 'flexStart'}>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <EuiTitle>
                        <h3>
                          {messageTitle ? (
                            messageTitle
                          ) : (
                            <FormattedMessage
                              id="xpack.triggersActionsUI.empty.title"
                              defaultMessage={'No results match your search criteria'}
                            />
                          )}
                        </h3>
                      </EuiTitle>
                      <p>
                        {messageBody ? (
                          messageBody
                        ) : (
                          <FormattedMessage
                            id="xpack.triggersActionsUI.empty.description"
                            defaultMessage={
                              'Try searching over a longer period of time or modifying your search'
                            }
                          />
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiImage css={{ width: 200, height: 148 }} size="200" alt="" url={icon} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
