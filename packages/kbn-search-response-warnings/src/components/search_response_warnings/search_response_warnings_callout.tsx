/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ViewDetailsPopover } from './view_details_popover';
import { getWarningsDescription, getWarningsTitle } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

interface Props {
  visualizationLabel?; string;
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsCallout = (props: Props) => {
  if (!props.warnings.length) {
    return null;
  }

  return (
    <EuiCallOut
      title={
        <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row" wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{getWarningsTitle(props.warnings)}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{getWarningsDescription(props.warnings, props.visualizationLabel)}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ViewDetailsPopover
              warnings={props.warnings}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      color="warning"
      iconType="warning"
      size="s"
      css={css`
        .euiTitle {
          display: flex;
          align-items: center;
        }
      `}
      data-test-subj="searchResponseWarningsCallout"
    />
  );
};