/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import type { BackNavigation } from './hooks';

const backLabel = i18n.translate('core.ui.chrome.appHeader.backButtonAriaLabel', {
  defaultMessage: 'Back',
});

const getBackToLabel = (destination: string) =>
  i18n.translate('core.ui.chrome.appHeader.backButtonAriaLabelWithDestination', {
    defaultMessage: 'Back to {destination}',
    values: { destination },
  });

const useBackButtonStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const button = css`
      color: ${euiTheme.colors.textSubdued};
    `;

    const link = css`
      display: inline-flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
    `;

    return { button, link };
  }, [euiTheme]);
};

export interface BackButtonProps {
  targets: BackNavigation[];
  showLabel?: boolean;
}

export const BackButton = React.memo<BackButtonProps>(({ targets, showLabel }) => {
  const styles = useBackButtonStyles();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const primary = targets[0];
  const label = primary?.backDestinationLabel
    ? getBackToLabel(primary.backDestinationLabel)
    : backLabel;

  if (!primary) {
    return null;
  }

  const hasMultipleTargets = targets.length > 1;

  const trigger = showLabel ? (
    <EuiLink
      color="text"
      css={styles.link}
      {...(hasMultipleTargets
        ? { onClick: togglePopover }
        : { href: primary.backHref, onClick: primary.backOnClick })}
      data-test-subj="appHeaderBack"
    >
      <EuiIcon type="sortLeft" aria-hidden />
      {label}
    </EuiLink>
  ) : (
    <EuiToolTip content={label} delay="long" disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="sortLeft"
        color="text"
        display="empty"
        size="xs"
        css={styles.button}
        aria-label={label}
        data-test-subj="appHeaderBack"
        {...(hasMultipleTargets
          ? { onClick: togglePopover }
          : { href: primary.backHref, onClick: primary.backOnClick })}
      />
    </EuiToolTip>
  );

  if (hasMultipleTargets) {
    return (
      <EuiPopover
        aria-label={label}
        button={trigger}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={targets.map((target, idx) => (
            <EuiContextMenuItem
              key={idx}
              href={target.backHref}
              onClick={target.backOnClick}
              size="s"
            >
              {target.backDestinationLabel ?? target.backHref}
            </EuiContextMenuItem>
          ))}
          size="s"
        />
      </EuiPopover>
    );
  }

  return trigger;
});

BackButton.displayName = 'BackButton';
