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
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useBackButton } from './hooks';

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

    return { button };
  }, [euiTheme]);
};

export const BackButton = React.memo(() => {
  const styles = useBackButtonStyles();
  const targets = useBackButton();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const primary = targets[0];
  const tooltip = primary?.backDestinationLabel
    ? getBackToLabel(primary.backDestinationLabel)
    : backLabel;

  if (!primary) {
    return null;
  }

  const buttonIcon = (
    <EuiButtonIcon
      iconType="sortLeft"
      color="text"
      display="empty"
      size="xs"
      css={styles.button}
      aria-label={tooltip}
      data-test-subj="chromeNextAppHeaderBack"
      {...(targets.length > 1 ? { onClick: togglePopover } : { href: primary.backHref })}
    />
  );

  if (targets.length > 1) {
    return (
      <EuiPopover
        button={
          <EuiToolTip content={tooltip} delay="long">
            {buttonIcon}
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={targets.map((target, idx) => (
            <EuiContextMenuItem key={idx} href={target.backHref} size="s">
              {target.backDestinationLabel ?? target.backHref}
            </EuiContextMenuItem>
          ))}
          size="s"
        />
      </EuiPopover>
    );
  }

  return (
    <EuiToolTip content={tooltip} delay="long">
      {buttonIcon}
    </EuiToolTip>
  );
});

BackButton.displayName = 'BackButton';
