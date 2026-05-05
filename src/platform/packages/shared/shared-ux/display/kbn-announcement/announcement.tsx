/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { AnnouncementProps } from './types';
import { useAnnouncementStyles } from './announcement.styles';

const dismissAriaLabel = i18n.translate('sharedUXPackages.announcement.dismissAriaLabel', {
  defaultMessage: 'Dismiss announcement',
});

/*
  TODO
  - [ ] extra accessibility SR announcement?
*/

/**
 * A banner-style announcement with optional media, actions and dismiss button.
 *
 * Layout adapts to the host container via container queries (super narrow,
 * narrow, wide) — there is no `width` prop. The visual scale is controlled by
 * the `size` prop.
 *
 * @default size 'm'
 * @default headingElement 'h2'
 */
export const Announcement = ({
  title,
  headingElement = 'h2',
  text,
  size = 'm',
  actionProps,
  media,
  onDismiss,
  dismissButtonProps,
  children,
  className,
  css: cssStyles,
  'data-test-subj': dataTestSubj = 'announcement',
}: AnnouncementProps) => {
  const styles = useAnnouncementStyles({ hasDismiss: Boolean(onDismiss) });

  const Heading = headingElement;
  const headingSize = size === 's' ? 'xxs' : size === 'm' ? 'xs' : 's';

  const primary = actionProps?.primary;
  const secondary = actionProps?.secondary;
  const hasActions = Boolean(primary || secondary);
  const actionsSize = size === 'l' ? 'm' : 's';

  return (
    <div
      className={className}
      css={cssStyles ? [styles.root, cssStyles] : styles.root}
      data-test-subj={dataTestSubj}
      data-size={size}
    >
      <div css={styles.container}>
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
            {text ? (
              <EuiText css={styles.text} size="s" data-test-subj={`${dataTestSubj}-text`}>
                {text}
              </EuiText>
            ) : null}
            {children && children}
          </div>

          {hasActions ? (
            <div css={styles.actions} data-test-subj={`${dataTestSubj}-actions`}>
              {primary ? (
                <EuiButton
                  data-test-subj={`${dataTestSubj}-primaryAction`}
                  {...primary}
                  color="primary"
                  size={actionsSize}
                />
              ) : null}
              {secondary ? (
                <EuiButtonEmpty
                  data-test-subj={`${dataTestSubj}-secondaryAction`}
                  {...secondary}
                  color="primary"
                  size={actionsSize}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

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
    </div>
  );
};
