/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect } from 'react';
import { EuiButtonIcon, EuiDataGridCellValueElementProps, EuiToolTip } from '@elastic/eui';
import themeDark from '@elastic/eui/dist/eui_theme_dark.json';
import themeLight from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { DiscoverGridContext } from './discover_grid_context';
import { EsHitRecord } from '../../angular/context/api/context';
/**
 * Button to expand a given row
 */
export const ExpandButton = ({ rowIndex, setCellProps }: EuiDataGridCellValueElementProps) => {
  const { expanded, setExpanded, rows, isDarkMode } = useContext(DiscoverGridContext);
  const current = rows[rowIndex];
  useEffect(() => {
    if ((current as EsHitRecord).isAnchor) {
      setCellProps({
        className: 'dscDocsGrid__cell--highlight',
      });
    } else if (expanded && current && expanded._id === current._id) {
      setCellProps({
        style: {
          backgroundColor: isDarkMode ? themeDark.euiColorHighlight : themeLight.euiColorHighlight,
        },
      });
    } else {
      setCellProps({ style: undefined });
    }
  }, [expanded, current, setCellProps, isDarkMode]);

  const isCurrentRowExpanded = current === expanded;
  const buttonLabel = i18n.translate('discover.grid.viewDoc', {
    defaultMessage: 'Toggle dialog with details',
  });

  return (
    <EuiToolTip content={buttonLabel} delay="long">
      <EuiButtonIcon
        size="xs"
        iconSize="s"
        aria-label={buttonLabel}
        data-test-subj="docTableExpandToggleColumn"
        onClick={() => setExpanded(isCurrentRowExpanded ? undefined : current)}
        color={isCurrentRowExpanded ? 'primary' : 'subdued'}
        iconType={isCurrentRowExpanded ? 'minimize' : 'expand'}
        isSelected={isCurrentRowExpanded}
      />
    </EuiToolTip>
  );
};
