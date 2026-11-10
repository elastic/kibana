/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FindingsState } from '../findings_store';
import { FindingsErrorCallout, FindingsList } from './findings_panel';
import { HOUSEKEEPING_FLYOUT_TITLE_ID } from '../metadata';
import { HOUSEKEEPING_DESCRIPTION, HOUSEKEEPING_TITLE, RERUN_LABEL } from '../texts';
import { SummaryPanel } from './summary_panel';

const i18nTexts = {
  close: i18n.translate('housekeeping.flyout.close', {
    defaultMessage: 'Close',
  }),
  scopedDescription: i18n.translate('housekeeping.flyout.scopedDescription', {
    defaultMessage: 'Showing the findings related to this page.',
  }),
  fullReport: i18n.translate('housekeeping.flyout.fullReport', {
    defaultMessage: 'Open the full report',
  }),
};

interface HousekeepingFlyoutContentProps {
  state: FindingsState;
  onRerun: () => void;
  onClose: () => void;
  /** Set when the flyout shows a scope, to link to every finding. */
  fullReport?: { href: string; onClick: (event: React.MouseEvent) => void };
}

/** Content of the Housekeeping flyout; the service renders the `EuiFlyout` around it. */
export const HousekeepingFlyoutContent = ({
  state,
  onRerun,
  onClose,
  fullReport,
}: HousekeepingFlyoutContentProps) => {
  const { response, error, isLoading, loadedAt } = state;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={HOUSEKEEPING_FLYOUT_TITLE_ID}>{HOUSEKEEPING_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {isLoading && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" data-test-subj="housekeepingFlyoutLoading" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {HOUSEKEEPING_DESCRIPTION}
            {fullReport && (
              <>
                {' '}
                {i18nTexts.scopedDescription}{' '}
                <EuiLink
                  href={fullReport.href}
                  onClick={fullReport.onClick}
                  data-test-subj="housekeepingFullReport"
                >
                  {i18nTexts.fullReport}
                </EuiLink>
              </>
            )}
          </p>
        </EuiText>
        {response && (
          <>
            <EuiSpacer size="xs" />
            <SummaryPanel response={response} loadedAt={loadedAt} />
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error && (
          <>
            <FindingsErrorCallout error={error} onRetry={onRerun} isLoading={isLoading} />
            <EuiSpacer size="m" />
          </>
        )}
        {response ? (
          <FindingsList response={response} />
        ) : (
          !error && <EuiSkeletonText lines={4} data-test-subj="housekeepingLoading" />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="housekeepingClose">
              {i18nTexts.close}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="refresh"
              onClick={onRerun}
              isLoading={isLoading}
              data-test-subj="housekeepingRerun"
            >
              {RERUN_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
