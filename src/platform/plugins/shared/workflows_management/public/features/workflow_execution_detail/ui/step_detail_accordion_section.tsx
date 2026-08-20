/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

interface StepDetailAccordionSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  /** Defaults to expanded, matching Alert/Entity overview sections. */
  defaultOpen?: boolean;
  /** Optional control(s) on the right of the header (e.g. Table/JSON toggle). */
  extraAction?: React.ReactNode;
  /** Accessible name for the toggle; defaults to a generic label. */
  toggleAriaLabel?: string;
  'data-test-subj'?: string;
}

/**
 * Alert/Entity-style accordion chrome for step-detail sections: right→down
 * chevron, no bordered card, and a full-bleed divider after the section so
 * expanded content stays visually contained.
 */
export const StepDetailAccordionSection = React.memo<StepDetailAccordionSectionProps>(
  ({
    title,
    children,
    defaultOpen = true,
    extraAction,
    toggleAriaLabel,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const ariaLabel =
      toggleAriaLabel ??
      (typeof title === 'string'
        ? i18n.translate('workflows.executionFlyout.stepDetail.toggleNamedSection', {
            defaultMessage: '{label} section',
            values: { label: title },
          })
        : i18n.translate('workflows.executionFlyout.stepDetail.toggleSection', {
            defaultMessage: 'Toggle section',
          }));

    return (
      <div css={{ flexShrink: 0 }} data-test-subj={dataTestSubj}>
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.xs,
            // Match Alert/Entity accordion rows: equal space above/below the header.
            paddingTop: euiTheme.size.m,
            paddingBottom: euiTheme.size.m,
          }}
        >
          <EuiButtonIcon
            iconType={isOpen ? 'chevronSingleDown' : 'chevronSingleRight'}
            size="xs"
            color="text"
            aria-expanded={isOpen}
            aria-label={ariaLabel}
            onClick={() => setIsOpen((v) => !v)}
            data-test-subj={dataTestSubj ? `${dataTestSubj}Toggle` : undefined}
          />
          <div
            css={{
              flex: 1,
              minWidth: 0,
              fontSize: euiTheme.size.m,
              fontWeight: euiTheme.font.weight.bold,
              color: euiTheme.colors.title,
            }}
          >
            {title}
          </div>
          {extraAction}
        </div>
        {isOpen && <div css={{ paddingBottom: euiTheme.size.m }}>{children}</div>}
        <EuiHorizontalRule
          margin="none"
          css={{
            marginLeft: `-${euiTheme.size.base}`,
            marginRight: `-${euiTheme.size.base}`,
            width: `calc(100% + (${euiTheme.size.base} * 2))`,
          }}
        />
      </div>
    );
  }
);

StepDetailAccordionSection.displayName = 'StepDetailAccordionSection';
