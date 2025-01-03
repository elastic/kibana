/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement, Children } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSplitPanel, EuiTitle, useEuiTheme } from '@elastic/eui';

import { getCategoryName } from '@kbn/management-settings-utilities';
import type { FieldRowProps } from '@kbn/management-settings-components-field-row';
import { css } from '@emotion/react';
import { ClearQueryLink, ClearQueryLinkProps } from './clear_query_link';

export const DATA_TEST_SUBJ_SETTINGS_CATEGORY = 'settingsCategory';

/**
 * Props for a {@link FieldCategory} component.
 */
export interface FieldCategoryProps
  extends Pick<ClearQueryLinkProps, 'onClearQuery' | 'fieldCount'> {
  /** The name of the category. */
  category: string;
  /** Children-- should be {@link FieldRow} components. */
  children:
    | ReactElement<FieldRowProps, 'FieldRow'>
    | Array<ReactElement<FieldRowProps, 'FieldRow'>>;
}

/**
 * Component for displaying a container of fields pertaining to a single
 * category.
 * @param props - the props to pass to the {@link FieldCategory} component.
 */
export const FieldCategory = (props: FieldCategoryProps) => {
  const { category, fieldCount, onClearQuery, children } = props;
  const {
    euiTheme: { size },
  } = useEuiTheme();

  const displayCount = Children.count(children);

  const panelCSS = css`
    & + & {
      margin-top: ${size.l};
    }
  `;

  return (
    <EuiSplitPanel.Outer hasBorder key={category} css={panelCSS}>
      <EuiSplitPanel.Inner color="subdued">
        <EuiFlexGroup alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2 data-test-subj={`${DATA_TEST_SUBJ_SETTINGS_CATEGORY}-${category}`}>
                {getCategoryName(category)}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <ClearQueryLink {...{ displayCount, fieldCount, onClearQuery }} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>{children}</EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
