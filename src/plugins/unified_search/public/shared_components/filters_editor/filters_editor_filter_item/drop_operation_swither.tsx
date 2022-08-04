/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/css';

import { EuiFlexGroup, EuiFlexItem, useEuiTheme, transparentize, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DropOperationSwitcher = ({}: {}) => {
  const { euiTheme } = useEuiTheme();
  const { colors, border } = euiTheme;

  return (
    <div
      className={css`
        background: ${transparentize(colors.warning, 0.13)};
        border: ${border.width.thin} dashed ${border.color};
        border-radius: ${border.radius.small};
      `}
    >
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="warning"
            onMouseUp={() => {
              // console.log('returnKey');
            }}
            isDisabled={false}
            iconType="returnKey"
            size="s"
            aria-label={i18n.translate(
              'unifiedSearch.filter.filterEditor.addOrFilterGroupButttonIcon',
              {
                defaultMessage: 'OR',
              }
            )}
          >
            OR
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="warning"
            onMouseUp={() => {
              // console.log('plus');
            }}
            isDisabled={false}
            iconType="plus"
            size="s"
            aria-label={i18n.translate(
              'unifiedSearch.filter.filterEditor.addOrFilterGroupButttonIcon',
              {
                defaultMessage: 'AND',
              }
            )}
          >
            AND
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
