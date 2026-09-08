/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiMemoizedStyles,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { FlyoutSectionProps } from './types';
import { renderTitleAction, renderTitleIcon, renderTitleWithIcon } from './title_adornments';

const getSectionStyles = ({ euiTheme }: UseEuiTheme) => ({
  section: css`
    [data-flyout-section] + & {
      margin-block-start: ${euiTheme.size.m};
    }
    /* Non-bordered/non-open preceding sibling: draw a rule above. */
    [data-flyout-section]:not([data-bordered]):not([data-open]) + & {
      padding-block-start: ${euiTheme.size.m};
      border-block-start: ${euiTheme.border.thin};
    }
  `,
});

export const FlyoutSection = ({
  title,
  icon,
  tooltip,
  action,
  hasBorder = false,
  children,
  'data-test-subj': dataTestSubj,
}: FlyoutSectionProps) => {
  const styles = useEuiMemoizedStyles(getSectionStyles);

  const titleWithIcon = renderTitleWithIcon(
    <EuiTitle size="xs">
      <h4>{title}</h4>
    </EuiTitle>,
    renderTitleIcon(icon, tooltip)
  );

  const header = action ? (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem grow={false}>{titleWithIcon}</EuiFlexItem>
      <EuiFlexItem grow={false}>{renderTitleAction(action)}</EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    titleWithIcon
  );

  return (
    <section
      css={styles.section}
      data-flyout-section="section"
      data-bordered={hasBorder || undefined}
      data-test-subj={dataTestSubj}
    >
      {header}
      <EuiSpacer size="s" />
      {hasBorder ? (
        <EuiPanel hasShadow={false} hasBorder paddingSize="m">
          {children}
        </EuiPanel>
      ) : (
        children
      )}
    </section>
  );
};
