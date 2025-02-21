/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiPopover, EuiSelectable, EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';

export function ChooseColumnPopover({
  columns,
  updateQuery,
}: {
  columns: string[];
  updateQuery: (column: string) => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<EuiSelectableOption[]>(
    columns.map((column) => ({ label: column }))
  );

  const onButtonClick = () => setIsPopoverOpen((status) => !status);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiLink
      css={css`
        vertical-align: top;
      `}
      onClick={onButtonClick}
      data-test-subj="chooseColumnBtn"
    >
      {i18n.translate('esql.flyout.chooseColumnBtn.label', {
        defaultMessage: 'here',
      })}
    </EuiLink>
  );

  const onColumnChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      setOptions(newOptions);

      const selectedColumn = newOptions.find((option) => option.checked === 'on');
      if (selectedColumn) {
        updateQuery(selectedColumn.label);
      }
    },
    [updateQuery]
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiSelectable
        aria-label={i18n.translate('esql.flyout.chooseColumnList.label', {
          defaultMessage: 'Select a column',
        })}
        searchable
        searchProps={{
          'data-test-subj': 'selectableColumnSearch',
        }}
        listProps={{
          'data-test-subj': 'selectableColumnList',
        }}
        singleSelection="always"
        options={options}
        onChange={onColumnChange}
        data-test-subj="selectableColumnContainer"
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
