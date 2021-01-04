/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useContext, useEffect } from 'react';
import { EuiButtonIcon, EuiDataGridCellValueElementProps, EuiToolTip } from '@elastic/eui';
import themeDark from '@elastic/eui/dist/eui_theme_dark.json';
import themeLight from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { DiscoverGridContext } from './discover_grid_context';
/**
 * Button to expand a given row
 */
export const ExpandButton = ({ rowIndex, setCellProps }: EuiDataGridCellValueElementProps) => {
  const { expanded, setExpanded, rows, isDarkMode } = useContext(DiscoverGridContext);
  const current = rows[rowIndex];
  useEffect(() => {
    if (expanded && current && expanded._id === current._id) {
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
        size="s"
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
