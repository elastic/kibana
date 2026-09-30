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
  useGeneratedHtmlId,
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
  id,
  title,
  icon,
  tooltip,
  action,
  hasBorder = false,
  borderOnChildren = false,
  children,
  'data-test-subj': dataTestSubj,
}: FlyoutSectionProps) => {
  const styles = useEuiMemoizedStyles(getSectionStyles);
  const sectionId = useGeneratedHtmlId({ conditionalId: id, prefix: 'flyoutSection' });
  const titleId = `${sectionId}_title`;

  const titleWithIcon = renderTitleWithIcon(
    <EuiTitle size="xs">
      <h4 id={titleId}>{title}</h4>
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
      id={sectionId}
      // An unnamed `section` is not exposed to assistive tech at all; naming it by its own
      // heading makes it a navigable region.
      aria-labelledby={titleId}
      css={styles.section}
      data-flyout-section="section"
      // Read by the divider rule above on the *following* sibling, so it must stay set even when
      // the panel itself lives on the children.
      data-bordered={hasBorder || undefined}
      data-test-subj={dataTestSubj}
    >
      {header}
      <EuiSpacer size="s" />
      {hasBorder && !borderOnChildren ? (
        <EuiPanel hasShadow={false} hasBorder paddingSize="m">
          {children}
        </EuiPanel>
      ) : (
        children
      )}
    </section>
  );
};
