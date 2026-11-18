/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const popoverContentStyles = css({ minWidth: 340, maxWidth: 400 });

const TRIAL_POPOVER_SELECTOR = '[data-context-switcher-trial-popover]';

/** Clicks inside the upgrade popover should not dismiss the menu underneath it. */
export const isTrialPopoverEvent = (event: Event) => {
  const target = event.target;
  return target instanceof Element && target.closest(TRIAL_POPOVER_SELECTOR) != null;
};

const TRIAL_LABEL = i18n.translate('contextSwitcherComponents.trialBadge.label', {
  defaultMessage: 'Trial',
});

const DEFAULT_TITLE = i18n.translate('contextSwitcherComponents.trialBadge.defaultTitle', {
  defaultMessage: 'Elastic Cloud Serverless',
});

const DESCRIPTION = i18n.translate('contextSwitcherComponents.trialBadge.description', {
  defaultMessage: "You're on an Elastic Cloud trial.",
});

const SUBSCRIBE_LABEL = i18n.translate('contextSwitcherComponents.trialBadge.subscribe', {
  defaultMessage: 'Subscribe',
});

const PRICING_LABEL = i18n.translate('contextSwitcherComponents.trialBadge.viewPricing', {
  defaultMessage: 'View pricing',
});

export interface TrialBadgeProps {
  /** Popover heading, for example "Elastic Security Serverless". */
  title?: string;
  /** Smaller line beside the heading, for example "AWS (us-east-1)". */
  subtitle?: string;
  subscribeHref?: string;
  pricingHref?: string;
}

/**
 * Trial badge that opens the upgrade popover on top of its parent menu.
 */
export const TrialBadge = ({ title, subtitle, subscribeHref, pricingHref }: TrialBadgeProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <EuiPopover
        ownFocus={false}
        hasArrow={false}
        anchorPosition="downLeft"
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="m"
        aria-label={i18n.translate('contextSwitcherComponents.trialBadge.popoverAriaLabel', {
          defaultMessage: 'Subscription details',
        })}
        panelProps={{
          'data-context-switcher-trial-popover': true,
          'data-test-subj': 'contextSwitcherTrialPopover',
        }}
        button={
          <EuiBadge
            color="primary"
            fill
            iconType="chevronSingleDown"
            iconSide="right"
            onClick={() => setIsOpen((open) => !open)}
            onClickAriaLabel={i18n.translate('contextSwitcherComponents.trialBadge.toggleAriaLabel', {
              defaultMessage: '{label}, show subscription details',
              values: { label: TRIAL_LABEL },
            })}
            data-test-subj="contextSwitcherTrialBadge"
          >
            {TRIAL_LABEL}
          </EuiBadge>
        }
      >
        <div css={popoverContentStyles}>
          <EuiFlexGroup gutterSize="s" alignItems="baseline" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h4>{title ?? DEFAULT_TITLE}</h4>
              </EuiTitle>
            </EuiFlexItem>
            {subtitle && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {subtitle}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s">{DESCRIPTION}</EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLink
                href={pricingHref}
                target={pricingHref ? '_blank' : undefined}
                disabled={!pricingHref}
                data-test-subj="contextSwitcherTrialPricing"
              >
                {PRICING_LABEL}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                href={subscribeHref}
                target={subscribeHref ? '_blank' : undefined}
                size="s"
                fill
                data-test-subj="contextSwitcherTrialSubscribe"
              >
                {SUBSCRIBE_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPopover>
    </div>
  );
};
