/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

interface DimensionsPopoverFooterProps {
  count: number;
  onClear: () => void;
}

/**
 * Footer row rendered below the search input in the dimensions popover.
 * Shows the current selection count and a "Clear selection" action when
 * there is anything to clear.
 */
export const DimensionsPopoverFooter = ({ count, onClear }: DimensionsPopoverFooterProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="xs"
        css={css`
          min-height: ${euiTheme.size.l};
        `}
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="metricsExperience.dimensionsSelector.selectedDimensionsCount"
              defaultMessage="{count, plural, one {# dimension selected} other {# dimensions selected}}"
              values={{ count }}
            />
          </EuiText>
        </EuiFlexItem>
        {count > 0 && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" flush="right" onClick={onClear}>
              <FormattedMessage
                id="metricsExperience.dimensionsSelector.clearSelection"
                defaultMessage="Clear selection"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
