/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, EuiThemeComputed } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { getGuidePanelStyles } from '../guide_panel.styles';

export const GuidePanelFlyoutFooter = ({
  styles,
  euiTheme,
  openQuitGuideModal,
}: {
  styles: ReturnType<typeof getGuidePanelStyles>;
  euiTheme: EuiThemeComputed;
  openQuitGuideModal: () => void;
}) => {
  return (
    <div css={styles.flyoutOverrides.flyoutFooter}>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        gutterSize="xs"
        responsive={false}
        wrap
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="questionInCircle"
            iconSide="right"
            href="https://cloud.elastic.co/support "
            target="_blank"
            css={styles.flyoutOverrides.flyoutFooterLink}
            iconSize="m"
          >
            {i18n.translate('guidedOnboarding.dropdownPanel.footer.support', {
              defaultMessage: 'Need help?',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color={euiTheme.colors.disabled}>
            |
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="faceHappy"
            iconSide="right"
            href="https://www.elastic.co/kibana/feedback"
            target="_blank"
            css={styles.flyoutOverrides.flyoutFooterLink}
            iconSize="s"
          >
            {i18n.translate('guidedOnboarding.dropdownPanel.footer.feedback', {
              defaultMessage: 'Give feedback',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color={euiTheme.colors.disabled}>
            |
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="exit"
            iconSide="right"
            onClick={openQuitGuideModal}
            data-test-subj="quitGuideButton"
            css={styles.flyoutOverrides.flyoutFooterLink}
            iconSize="s"
          >
            {i18n.translate('guidedOnboarding.dropdownPanel.footer.exitGuideButtonLabel', {
              defaultMessage: 'Quit guide',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
