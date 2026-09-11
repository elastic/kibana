/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiPopover, EuiSelectable, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EXECUTIONS_GROUP_BY_VALUES,
  type ExecutionsGroupBy,
  getExecutionsGroupByLabel,
} from './workflow_executions_group_by';

const optionsPanelCss = css`
  width: 220px;
`;

export interface WorkflowExecutionsGroupByControlProps {
  value: ExecutionsGroupBy;
  onChange: (value: ExecutionsGroupBy) => void;
}

export const WorkflowExecutionsGroupByControl = React.memo<WorkflowExecutionsGroupByControlProps>(
  ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverId = useGeneratedHtmlId({ prefix: 'executionsTableGroupBy' });

    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const options = useMemo<Array<EuiSelectableOption & { key: ExecutionsGroupBy }>>(
      () =>
        EXECUTIONS_GROUP_BY_VALUES.map((optionValue) => ({
          key: optionValue,
          label: getExecutionsGroupByLabel(optionValue),
          checked: optionValue === value ? ('on' as const) : undefined,
          'data-test-subj': `executionsTableGroupBy-${optionValue}`,
        })),
      [value]
    );

    const buttonLabel = i18n.translate(
      'workflowsManagement.executionsPage.table.groupBy.buttonLabel',
      {
        defaultMessage: 'Group executions by: {selection}',
        values: { selection: getExecutionsGroupByLabel(value) },
      }
    );

    return (
      <EuiPopover
        id={popoverId}
        isOpen={isOpen}
        closePopover={close}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        aria-label={buttonLabel}
        button={
          <EuiButtonEmpty
            size="xs"
            iconType="chevronSingleDown"
            iconSide="right"
            color="text"
            onClick={toggle}
            data-test-subj="executionsTableGroupBySelector"
          >
            {buttonLabel}
          </EuiButtonEmpty>
        }
      >
        <EuiSelectable
          singleSelection
          options={options}
          onChange={(nextOptions) => {
            const selected = nextOptions.find((option) => option.checked === 'on');
            if (selected?.key) {
              onChange(selected.key as ExecutionsGroupBy);
            }
            close();
          }}
          listProps={{ rowHeight: 40, isVirtualized: false }}
        >
          {(list) => (
            <div css={optionsPanelCss} data-test-subj="executionsTableGroupByOptions">
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    );
  }
);

WorkflowExecutionsGroupByControl.displayName = 'WorkflowExecutionsGroupByControl';
