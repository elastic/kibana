/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiMemoizedStyles,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { FlyoutAccordionProps } from './types';
import { renderTitleAction, renderTitleIcon, renderTitleWithIcon } from './title_adornments';

const getAccordionStyles = ({ euiTheme }: UseEuiTheme) => ({
  wrapper: css`
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

export const FlyoutAccordion = ({
  id,
  title,
  icon,
  tooltip,
  action,
  initialIsOpen = false,
  hasBorder = true,
  children,
  'data-test-subj': dataTestSubj,
}: FlyoutAccordionProps) => {
  const styles = useEuiMemoizedStyles(getAccordionStyles);
  const accordionId = useGeneratedHtmlId({ conditionalId: id, prefix: 'flyoutAccordion' });
  const [isOpen, setIsOpen] = useState(false);

  // Delay initial open so EuiAccordion measures nonzero height inside the animated flyout.
  useEffect(() => {
    if (!initialIsOpen) return undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setIsOpen(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [initialIsOpen]);

  // Keep heading elements out of the accordion button's phrasing content.
  const buttonContent = renderTitleWithIcon(
    <EuiTitle size="xs">
      <span>{title}</span>
    </EuiTitle>,
    renderTitleIcon(icon, tooltip)
  );

  return (
    <div css={styles.wrapper} data-flyout-section="accordion" data-open={isOpen || undefined}>
      <EuiAccordion
        id={accordionId}
        buttonContent={buttonContent}
        extraAction={action ? renderTitleAction(action) : undefined}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={setIsOpen}
        data-test-subj={dataTestSubj}
      >
        <EuiSpacer size="s" />
        {hasBorder ? (
          <EuiPanel hasShadow={false} hasBorder paddingSize="m">
            {children}
          </EuiPanel>
        ) : (
          children
        )}
      </EuiAccordion>
    </div>
  );
};
