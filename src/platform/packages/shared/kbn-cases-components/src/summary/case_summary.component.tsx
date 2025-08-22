/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import moment from 'moment';

import { EuiFlexItem, EuiSpacer, EuiAccordion, EuiPanel } from '@elastic/eui';
import type { InferenceConnector } from '@kbn/inference-common';

import { CASE_SUMMARY_TITLE as title } from './translations';
import { SummaryButton } from './summary_button';
import { SummaryResponse, type SummaryResponseProps } from './summary_response';

export type Connector = Pick<InferenceConnector, 'connectorId'>;

export interface CaseSummaryComponentProps extends Pick<SummaryResponseProps, 'summary'> {
  caseId: string;
  connectors: Connector[];
  error: Error | null;
  isLoading?: boolean;
  onSummaryClick: ({ caseId, connectorId }: { caseId: string; connectorId: string }) => void;
}

export const CaseSummaryComponent = ({
  caseId,
  connectors,
  error,
  isLoading = false,
  onSummaryClick: onSummaryClickProp,
  ...summaryProps
}: CaseSummaryComponentProps) => {
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState('');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const onSummaryClick = useCallback(() => {
    if (connectors.length > 0) {
      onSummaryClickProp({ caseId, connectorId: connectors[0].connectorId });
      setSummaryGeneratedAt(moment().toISOString());
    }
  }, [onSummaryClickProp, connectors, caseId]);

  const onToggle = useCallback(
    (isOpen: boolean) => {
      setIsSummaryOpen(isOpen);
      if (isOpen && onSummaryClick) {
        onSummaryClick();
      }
    },
    [onSummaryClick]
  );

  const date = moment(summaryGeneratedAt).format('MMM DD, yyyy');
  const time = moment(summaryGeneratedAt).format('HH:mm');

  const buttonContent = (
    <SummaryButton
      {...{
        date,
        isSummaryOpen,
        onSummaryClick,
        time,
        title,
      }}
    />
  );

  return (
    <EuiFlexItem grow={false} data-test-subj="caseSummary">
      <EuiPanel hasBorder hasShadow={false}>
        <EuiAccordion
          id="caseSummaryContainer"
          arrowProps={{ css: { alignSelf: 'flex-start' } }}
          isDisabled={isLoading}
          {...{
            buttonContent,
            isLoading,
            onToggle,
          }}
        >
          {!error && <SummaryResponse {...summaryProps} />}
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="m" />
    </EuiFlexItem>
  );
};

CaseSummaryComponent.displayName = 'CaseSummaryComponent';
