/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';

import {
  useGetCaseSummary,
  useGetConnectors,
  type UseGetConnectorsParams,
  type UseGetCaseSummaryParams,
} from './hooks';

import { CaseSummaryComponent, type CaseSummaryComponentProps } from './case_summary.component';
export type { Connector } from './case_summary.component';

export type CaseSummaryProps = Pick<CaseSummaryComponentProps, 'caseId'> &
  UseGetConnectorsParams &
  UseGetCaseSummaryParams;

export const CaseSummary: React.FC<CaseSummaryProps> = ({ caseId, http }) => {
  const { isLoading: isConnectorsLoading, connectors, getConnectors } = useGetConnectors({ http });

  const {
    isLoading: isCaseSummaryLoading,
    summary,
    error,
    getCaseSummary,
  } = useGetCaseSummary({
    http,
  });

  useEffect(() => {
    getConnectors();
  }, [getConnectors]);

  return (
    <CaseSummaryComponent
      caseId={caseId}
      connectors={connectors}
      error={error}
      isLoading={isConnectorsLoading || isCaseSummaryLoading}
      onSummaryClick={getCaseSummary}
      summary={summary}
    />
  );
};

CaseSummary.displayName = 'CaseSummary';
