/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { ViewMode, ViewModeToggleProps } from './types';

/**
 * Toggle options for the view mode.
 */
const toggleOptions = [
  {
    id: 'grid' as ViewMode,
    label: i18n.translate('contentManagement.contentList.viewModeToggle.gridView', {
      defaultMessage: 'Grid view',
    }),
    iconType: 'apps',
  },
  {
    id: 'table' as ViewMode,
    label: i18n.translate('contentManagement.contentList.viewModeToggle.tableView', {
      defaultMessage: 'Table view',
    }),
    iconType: 'list',
  },
];

/**
 * CSS for consistent button sizing in the toggle.
 */
const buttonGroupStyles = css`
  .euiButtonGroup__buttons .euiButtonGroupButton {
    min-width: 40px;
    width: 40px;
  }
`;

/**
 * A toggle button group for switching between table and grid view modes.
 *
 * Follows the pattern from the Kibana space selector screen.
 *
 * @example
 * ```tsx
 * const [viewMode, setViewMode] = useState<ViewMode>('table');
 *
 * <ViewModeToggle
 *   viewMode={viewMode}
 *   onChange={setViewMode}
 *   data-test-subj="dashboardViewModeToggle"
 * />
 * ```
 */
export const ViewModeToggle: FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
  'data-test-subj': dataTestSubj = 'contentListViewModeToggle',
}) => {
  return (
    <EuiButtonGroup
      css={buttonGroupStyles}
      legend={i18n.translate('contentManagement.contentList.viewModeToggle.legend', {
        defaultMessage: 'View options',
      })}
      options={toggleOptions}
      idSelected={viewMode}
      onChange={(id) => onChange(id as ViewMode)}
      buttonSize="m"
      isIconOnly
      data-test-subj={dataTestSubj}
    />
  );
};
