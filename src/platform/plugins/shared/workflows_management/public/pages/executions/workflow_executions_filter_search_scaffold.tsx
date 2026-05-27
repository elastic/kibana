/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const searchBarWrapperCss = css`
  min-width: 200px;
  & .euiPopover {
    display: block;
  }
`;

const searchAriaLabel = i18n.translate(
  'workflowsManagement.executionsPage.searchScaffoldAriaLabel',
  {
    defaultMessage: 'Search executions (not yet available)',
  }
);

const searchPlaceholder = i18n.translate(
  'workflowsManagement.executionsPage.searchScaffoldPlaceholder',
  {
    defaultMessage: 'Execution ID / workflow name',
  }
);

const filterStatusLabel = i18n.translate(
  'workflowsManagement.executionsPage.filterScaffoldStatus',
  {
    defaultMessage: 'Status',
  }
);

const filterWorkflowLabel = i18n.translate(
  'workflowsManagement.executionsPage.filterScaffoldWorkflow',
  {
    defaultMessage: 'Workflow',
  }
);

const filterTimeRangeLabel = i18n.translate(
  'workflowsManagement.executionsPage.filterScaffoldTimeRange',
  {
    defaultMessage: 'Time range',
  }
);

export const WorkflowExecutionsFilterSearchScaffold = React.memo(() => (
  <div data-test-subj="workflowExecutionsSearchFilterScaffold">
    <EuiScreenReaderOnly>
      <p>
        <FormattedMessage
          id="workflowsManagement.executionsPage.searchFilterScaffoldScreenReader"
          defaultMessage="Search and filter controls are shown for layout only; they are not connected yet."
        />
      </p>
    </EuiScreenReaderOnly>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow css={searchBarWrapperCss}>
        <EuiFieldSearch
          aria-label={searchAriaLabel}
          data-test-subj="workflowExecutionsSearchFieldScaffold"
          defaultValue=""
          disabled
          fullWidth
          incremental={false}
          placeholder={searchPlaceholder}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            disabled
            grow
            iconType="chevronSingleDown"
            numFilters={0}
            data-test-subj="workflowExecutionsFilterScaffoldStatus"
          >
            {filterStatusLabel}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            disabled
            grow
            iconType="chevronSingleDown"
            numFilters={0}
            data-test-subj="workflowExecutionsFilterScaffoldWorkflow"
          >
            {filterWorkflowLabel}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            disabled
            grow
            iconType="chevronSingleDown"
            numFilters={0}
            data-test-subj="workflowExecutionsFilterScaffoldTimeRange"
          >
            {filterTimeRangeLabel}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
));
WorkflowExecutionsFilterSearchScaffold.displayName = 'WorkflowExecutionsFilterSearchScaffold';
