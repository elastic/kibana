/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiTitle,
  EuiText,
  EuiLiveAnnouncer,
  useEuiBackgroundColorCSS,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import type { AnnouncementBannerProps } from './types';
import { announcementBannerStyles } from './announcement_banner.styles';

/**
 * A banner-style announcement with optional media, actions and dismiss button.
 *
 * Layout adapts to the host container via container queries (super narrow,
 * narrow, wide) — there is no `width` prop. The visual scale is controlled by
 * the `size` prop.
 */
export const AnnouncementBanner = ({
  title,
  headingElement = 'h2',
  text,
  size = 'm',
  color = 'highlighted',
  actionProps,
  media,
  onDismiss,
  dismissButtonProps,
  children,
  className,
  css: cssStyles,
  announceOnMount = false,
  'data-test-subj': dataTestSubj = 'announcementBanner',
}: AnnouncementBannerProps) => {
  const styles = useMemoCss(announcementBannerStyles);

  const dismissAriaLabel = i18n.translate('sharedUXPackages.announcementBanner.dismissAriaLabel', {
    defaultMessage: 'Dismiss "{title}" announcement',
    values: {
      title,
    },
  });

  const Heading = headingElement;
  const headingSize = size === 's' ? 'xxs' : size === 'm' ? 'xs' : 's';

  const primaryActionProps = actionProps?.primary;
  const secondaryActionProps = actionProps?.secondary;
  // a standalone secondary action is not supported
  const hasActions = Boolean(primaryActionProps);

  const backgroundColorStyles = useEuiBackgroundColorCSS()[color];
  const rootCssStyles = [styles.root, backgroundColorStyles, cssStyles];
  const containerCssStyles = [styles.container, onDismiss && styles.hasDismiss];

  return (
    <div
      className={className}
      css={rootCssStyles}
      data-test-subj={dataTestSubj}
      data-size={size}
      data-color={color}
    >
      <div css={containerCssStyles}>
        {media ? (
          <div css={styles.media} data-test-subj={`${dataTestSubj}-media`}>
            {media}
          </div>
        ) : null}

        <div css={styles.body}>
          <div css={styles.content}>
            <EuiTitle size={headingSize}>
              <Heading css={styles.title} data-test-subj={`${dataTestSubj}-title`}>
                {title}
              </Heading>
            </EuiTitle>

            {/* make the dismiss button discoverable early for screen readers,
            but ensure the title is rendered before to provide a meaningful context */}
            {onDismiss ? (
              <EuiButtonIcon
                iconType="cross"
                color="text"
                aria-label={dismissAriaLabel}
                data-test-subj={`${dataTestSubj}-dismiss`}
                {...dismissButtonProps}
                css={styles.dismiss}
                onClick={onDismiss}
              />
            ) : null}

            {text ? (
              <EuiText
                css={styles.text}
                size="s"
                color="subdued"
                data-test-subj={`${dataTestSubj}-text`}
              >
                {text}
              </EuiText>
            ) : null}
            {children && children}
          </div>

          {hasActions ? (
            <div css={styles.actions} data-test-subj={`${dataTestSubj}-actions`}>
              {primaryActionProps ? (
                <EuiButton
                  data-test-subj={`${dataTestSubj}-primaryAction`}
                  {...primaryActionProps}
                  color="primary"
                  size="s"
                />
              ) : null}
              {secondaryActionProps ? (
                <EuiButtonEmpty
                  data-test-subj={`${dataTestSubj}-secondaryAction`}
                  {...secondaryActionProps}
                  color="primary"
                  size="s"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {announceOnMount && (
        <EuiLiveAnnouncer>
          {title && title}
          {title && text && ',\u00A0'}
          {text && text}
          {(title || text) && children && ',\u00A0'}
          {children && children}
        </EuiLiveAnnouncer>
      )}
    </div>
  );
};
