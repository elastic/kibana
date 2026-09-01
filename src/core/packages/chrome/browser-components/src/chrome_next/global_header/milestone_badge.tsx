/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MILESTONE_LABEL = i18n.translate('core.ui.chrome.milestone.label', {
  defaultMessage: 'V1 Milestone',
});

const MILESTONE_DESCRIPTION = i18n.translate('core.ui.chrome.milestone.description', {
  defaultMessage: 'UX prototype using hardcoded data. Limited capabilities.',
});

const READ_MORE_LABEL = i18n.translate('core.ui.chrome.milestone.readMoreLabel', {
  defaultMessage: 'Read more',
});

const useMilestoneStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      pill: css`
        display: inline-flex;
        align-items: center;
        min-width: 0;
        max-width: 100%;
        gap: ${euiTheme.size.xs};
        padding: ${euiTheme.size.xxs} ${euiTheme.size.s} ${euiTheme.size.xxs} ${euiTheme.size.s};
        border-radius: ${euiTheme.border.radius.medium};
        background-color: ${euiTheme.colors.backgroundBaseInteractiveHoverAssistance};
        color: ${euiTheme.colors.textAssistance};
      `,
      text: css`
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `,
      readMore: css`
        flex-shrink: 0;
        margin-inline-start: ${euiTheme.size.xs};
      `,
    }),
    [euiTheme]
  );
};

/**
 * A prototype milestone indicator rendered in the global header. It shows the
 * current milestone as a compact pill and opens a flyout with details about the
 * prototype's scope and limitations.
 */
export const MilestoneBadge = React.memo(() => {
  const styles = useMilestoneStyles();
  const { euiTheme } = useEuiTheme();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'chromeMilestoneFlyout' });

  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  return (
    <>
      <div css={styles.pill} data-test-subj="chromeNextGlobalHeaderMilestonePill">
        <EuiIcon type="flask" size="s" color={euiTheme.colors.textAssistance} aria-hidden />
        <EuiText size="xs" color={euiTheme.colors.textAssistance} css={styles.text}>
          <strong>{MILESTONE_LABEL}</strong>
          {' — '}
          {MILESTONE_DESCRIPTION}
        </EuiText>
        <EuiButtonEmpty
          size="xs"
          flush="both"
          onClick={openFlyout}
          css={styles.readMore}
          data-test-subj="chromeNextGlobalHeaderMilestoneReadMore"
        >
          {READ_MORE_LABEL}
        </EuiButtonEmpty>
      </div>

      {isFlyoutOpen && (
        <EuiFlyout
          onClose={closeFlyout}
          size="s"
          aria-labelledby={flyoutTitleId}
          data-test-subj="chromeNextGlobalHeaderMilestoneFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiBadge color="hollow" iconType="flask">
              {MILESTONE_LABEL}
            </EuiBadge>
            <EuiSpacer size="s" />
            <EuiTitle size="s">
              <h2 id={flyoutTitleId}>
                {i18n.translate('core.ui.chrome.milestone.flyoutTitle', {
                  defaultMessage: 'About this prototype',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText size="s">
              <p>
                {i18n.translate('core.ui.chrome.milestone.flyoutIntro', {
                  defaultMessage:
                    'This is an early UX prototype. It exists to explore and gather feedback on the interaction design — not to demonstrate a fully working product.',
                })}
              </p>

              <h3>
                {i18n.translate('core.ui.chrome.milestone.flyoutExploreHeading', {
                  defaultMessage: 'What you can explore',
                })}
              </h3>
              <ul>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutExploreViews', {
                    defaultMessage: 'The core screens, navigation, and end-to-end flows.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutExploreInteractions', {
                    defaultMessage:
                      'The primary interactions and how the experience fits together.',
                  })}
                </li>
              </ul>

              <h3>
                {i18n.translate('core.ui.chrome.milestone.flyoutLimitationsHeading', {
                  defaultMessage: 'Known limitations',
                })}
              </h3>
              <ul>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutLimitationHardcoded', {
                    defaultMessage:
                      'The data shown is hardcoded and does not reflect a real cluster. Changes are not persisted.',
                  })}
                </li>
                <li>
                  {i18n.translate('core.ui.chrome.milestone.flyoutLimitationScope', {
                    defaultMessage:
                      'Scope and capabilities are limited — some actions and links are non-functional.',
                  })}
                </li>
              </ul>
            </EuiText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj="chromeNextGlobalHeaderMilestoneFlyoutClose"
            >
              {i18n.translate('core.ui.chrome.milestone.flyoutCloseLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
});

MilestoneBadge.displayName = 'MilestoneBadge';
