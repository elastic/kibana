/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useRef } from 'react';
import { css } from '@emotion/react';
import { useFilterBarContext } from '../filter_bar_context';

const collapseLabel = i18n.translate(
  'unifiedSearch.filter.filterBarToggleButton.collapseFiltersButtonLabel',
  {
    defaultMessage: 'Collapse filters',
  }
);
const expandLabel = i18n.translate(
  'unifiedSearch.filter.filterBarToggleButton.expandFiltersButtonLabel',
  {
    defaultMessage: 'Expand filters',
  }
);

export const FilterBarToggleButton: React.FC<{}> = () => {
  const { isCollapsed, onToggleCollapse, expandablePillsId, numActiveFilters } =
    useFilterBarContext();
  const themeContext = useEuiTheme();
  const styles = toggleStyles(themeContext);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <EuiToolTip content={isCollapsed ? expandLabel : collapseLabel} disableScreenReaderOutput>
      <EuiButtonEmpty
        buttonRef={buttonRef}
        color="text"
        aria-label={isCollapsed ? expandLabel : collapseLabel}
        aria-expanded={!isCollapsed}
        aria-controls={expandablePillsId}
        onClick={onToggleCollapse}
        css={styles.filterButtonStyle}
        size="s"
        data-test-subj="filterBarToggleButton"
      >
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem>
            <EuiIcon type="filter" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiNotificationBadge color="subdued">{numActiveFilters}</EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};

const toggleStyles = ({ euiTheme }: UseEuiTheme) => ({
  filterButtonStyle: css`
    padding-inline: ${euiTheme.size.xs};
  `,
});
