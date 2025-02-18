/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiProgress,
} from '@elastic/eui';
import usePrevious from 'react-use/lib/usePrevious';
import type { Alert } from '@kbn/alerting-types';
import { DefaultAlertsFlyoutBody, DefaultAlertsFlyoutHeader } from './default_alerts_flyout';
import {
  AdditionalContext,
  FlyoutSectionProps,
  FlyoutSectionRenderer,
  RenderContext,
} from '../types';

const PAGINATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.paginationLabel',
  {
    defaultMessage: 'Alert navigation',
  }
);

export const AlertsFlyout = <AC extends AdditionalContext>({
  alert,
  ...renderContext
}: RenderContext<AC> & {
  alert: Alert;
  flyoutIndex: number;
  isLoading: boolean;
  onClose: () => void;
  onPaginate: (pageIndex: number) => void;
}) => {
  const {
    flyoutIndex,
    alertsCount,
    onClose,
    onPaginate,
    isLoading,
    renderFlyoutHeader: Header = DefaultAlertsFlyoutHeader,
    renderFlyoutBody: Body = DefaultAlertsFlyoutBody,
    renderFlyoutFooter,
  } = renderContext;
  const Footer: FlyoutSectionRenderer<AC> | undefined = renderFlyoutFooter;
  const prevAlert = usePrevious(alert);
  const props = useMemo(
    () =>
      ({
        ...renderContext,
        // Show the previous alert while loading the next one
        alert: alert === undefined && prevAlert != null ? prevAlert : alert,
      } as FlyoutSectionProps<AC>),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alert, renderContext]
  );

  const FlyoutHeader = useCallback(
    () =>
      Header ? (
        <Suspense fallback={null}>
          <Header<AC> {...props} />
        </Suspense>
      ) : null,
    [Header, props]
  );

  const FlyoutBody = useCallback(
    () =>
      Body ? (
        <Suspense fallback={null}>
          <Body<AC> {...props} />
        </Suspense>
      ) : null,
    [Body, props]
  );

  const FlyoutFooter = useCallback(
    () =>
      Footer ? (
        <Suspense fallback={null}>
          <Footer {...props} />
        </Suspense>
      ) : null,
    [Footer, props]
  );

  return (
    <EuiFlyout onClose={onClose} size="m" data-test-subj="alertsFlyout" ownFocus={false}>
      {isLoading && <EuiProgress size="xs" color="accent" data-test-subj="alertsFlyoutLoading" />}
      <EuiFlyoutHeader hasBorder>
        <FlyoutHeader />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiPagination
              aria-label={PAGINATION_LABEL}
              pageCount={alertsCount}
              activePage={flyoutIndex}
              onPageClick={onPaginate}
              compressed
              data-test-subj="alertsFlyoutPagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <FlyoutBody />
      <FlyoutFooter />
    </EuiFlyout>
  );
};

// Lazy loading helpers
// eslint-disable-next-line import/no-default-export
export { AlertsFlyout as default };
export type AlertsFlyout = typeof AlertsFlyout;
