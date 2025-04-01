/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
import { EuiButtonIcon, EuiHorizontalRule, EuiSpacer, EuiTitle, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GuideConfig } from '@kbn/guided-onboarding';
import { getGuidePanelStyles } from '../guide_panel.styles';

export const GuidePanelFlyoutHeader = ({
  styles,
  titleId,
  toggleGuide,
  hasError,
  isGuideReadyToComplete,
  guideConfig,
  backButton,
}: {
  styles: ReturnType<typeof getGuidePanelStyles>;
  titleId: string;
  toggleGuide: () => void;
  hasError: boolean;
  isGuideReadyToComplete: boolean;
  guideConfig?: GuideConfig;
  backButton: ReactElement;
}) => {
  /**
   * ESC key closes CustomFlyout
   */
  const onKeyDown = (event: any) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      toggleGuide();
    }
  };

  const getTitle = () => {
    if (isGuideReadyToComplete) {
      return i18n.translate('guidedOnboarding.dropdownPanel.completeGuideFlyoutTitle', {
        defaultMessage: 'Well done!',
      });
    }

    return guideConfig ? guideConfig.title : '';
  };

  const closeIcon = (
    <EuiButtonIcon
      iconType="cross"
      aria-label={i18n.translate('guidedOnboarding.dropdownPanel.closeButton.ariaLabel', {
        defaultMessage: 'Close modal',
      })}
      onClick={toggleGuide}
      onKeyDown={onKeyDown}
      color="text"
      css={styles.flyoutOverrides.flyoutCloseButtonIcon}
    />
  );

  if (hasError) {
    return (
      <div css={styles.flyoutOverrides.flyoutHeaderError}>
        {backButton}
        {closeIcon}
      </div>
    );
  }

  return (
    <div css={styles.flyoutOverrides.flyoutHeader}>
      <EuiSpacer size="s" />

      {backButton}

      <EuiSpacer size="s" />

      <EuiTitle size="m">
        <h2 id={titleId} data-test-subj="guideTitle">
          {getTitle()}
        </h2>
      </EuiTitle>

      {closeIcon}

      <EuiHorizontalRule />
    </div>
  );
};
