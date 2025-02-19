/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { EuiLink, EuiSkeletonText } from '@elastic/eui';
import { Tooltip as CaseTooltip } from '@kbn/cases-components';
import type { CaseTooltipContentProps } from '@kbn/cases-components';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import type { CellComponent } from '../types';
import { useCaseViewNavigation } from '../hooks/use_case_view_navigation';
import type { Case } from '../apis/bulk_get_cases';

const formatCase = (theCase: Case): CaseTooltipContentProps => ({
  title: theCase.title,
  description: theCase.description,
  createdAt: theCase.created_at,
  createdBy: {
    username: theCase.created_by.username ?? undefined,
    fullName: theCase.created_by.full_name ?? undefined,
  },
  status: theCase.status,
  totalComments: theCase.totalComment,
});

export const CasesCell: CellComponent = memo((props) => {
  const { isLoading, alert, cases, caseAppId } = props;
  const {
    services: { application },
  } = useAlertsTableContext();
  const { navigateToCaseView } = useCaseViewNavigation(application, caseAppId);

  const caseIds = (alert && (alert[ALERT_CASE_IDS] as string[])) ?? [];

  const validCases = caseIds
    .map((id) => cases?.get(id))
    .filter((theCase): theCase is Case => theCase != null);

  return (
    <EuiSkeletonText lines={1} isLoading={isLoading} size="s" data-test-subj="cases-cell-loading">
      {validCases.length !== 0
        ? validCases.map((theCase, index) => [
            index > 0 && index < validCases.length && ', ',
            <CaseTooltip loading={false} content={formatCase(theCase)} key={theCase.id}>
              <EuiLink
                onClick={() => navigateToCaseView({ caseId: theCase.id })}
                data-test-subj="cases-cell-link"
              >
                {theCase.title}
              </EuiLink>
            </CaseTooltip>,
          ])
        : '--'}
    </EuiSkeletonText>
  );
});
