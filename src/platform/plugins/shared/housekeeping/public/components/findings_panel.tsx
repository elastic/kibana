/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { HousekeepingFindingsResponse } from '../../common';
import type { FindingsState } from '../findings_store';
import { ResourceTypesContext } from '../metadata';
import { SummaryPanel } from './summary_panel';
import { FindingsTable } from './findings_table';

const i18nTexts = {
  errorTitle: i18n.translate('housekeeping.panel.errorTitle', {
    defaultMessage: 'The checks could not run',
  }),
  retry: i18n.translate('housekeeping.panel.retry', {
    defaultMessage: 'Try again',
  }),
  allClearTitle: i18n.translate('housekeeping.panel.allClearTitle', {
    defaultMessage: 'No configuration issues found',
  }),
  allClearBody: i18n.translate('housekeeping.panel.allClearBody', {
    defaultMessage: 'Every check ran and found nothing to clean up.',
  }),
  partialClearTitle: i18n.translate('housekeeping.panel.partialClearTitle', {
    defaultMessage: 'No issues found in the checks that ran',
  }),
};

export const FindingsErrorCallout = ({
  error,
  onRetry,
  isLoading,
}: {
  error: string;
  onRetry: () => void;
  isLoading: boolean;
}) => (
  <KbnDangerCallout
    announceOnMount
    size="s"
    title={i18nTexts.errorTitle}
    text={<p>{error}</p>}
    actionProps={{ primary: { children: i18nTexts.retry, onClick: onRetry, isLoading } }}
    data-test-subj="housekeepingError"
  />
);

/** Every finding, or a message when the checks found nothing. */
export const FindingsList = ({ response }: { response: HousekeepingFindingsResponse }) => {
  const { kinds, groups, skipped, resourceTypes } = response;

  if (groups.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="checkCircleFill"
        color="success"
        titleSize="xs"
        title={
          <h3>{skipped.length === 0 ? i18nTexts.allClearTitle : i18nTexts.partialClearTitle}</h3>
        }
        body={skipped.length === 0 ? <p>{i18nTexts.allClearBody}</p> : undefined}
        data-test-subj="housekeepingAllClear"
      />
    );
  }

  return (
    <ResourceTypesContext.Provider value={resourceTypes}>
      <FindingsTable groups={groups} kinds={kinds} />
    </ResourceTypesContext.Provider>
  );
};

interface FindingsPanelProps {
  state: FindingsState;
  onRetry: () => void;
}

export const FindingsPanel = ({ state, onRetry }: FindingsPanelProps) => {
  const { response, error, isLoading, loadedAt } = state;

  const errorCallout = error ? (
    <>
      <FindingsErrorCallout error={error} onRetry={onRetry} isLoading={isLoading} />
      <EuiSpacer size="m" />
    </>
  ) : null;

  if (!response) {
    return errorCallout ?? <EuiSkeletonText lines={4} data-test-subj="housekeepingLoading" />;
  }

  return (
    <>
      {errorCallout}
      <SummaryPanel response={response} loadedAt={loadedAt} />
      <EuiSpacer size="l" />
      <FindingsList response={response} />
    </>
  );
};
