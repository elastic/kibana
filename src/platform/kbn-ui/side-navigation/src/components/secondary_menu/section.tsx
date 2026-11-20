/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiButtonEmpty, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { NAVIGATION_SELECTOR_PREFIX } from '../../constants';
import { useShowMore } from '../../hooks/use_show_more';

export interface SecondaryMenuSectionProps {
  children: ReactNode;
  id?: string;
  isPaginated?: boolean;
  label?: string;
}

export const SecondaryMenuSectionComponent = ({
  children,
  id,
  isPaginated = false,
  label,
}: SecondaryMenuSectionProps): JSX.Element => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme, highContrastMode } = euiThemeContext;

  const { hasMore, listRef, showMore, visibleItems } = useShowMore(children, isPaginated);

  const sectionId = label ? label.replace(/\s+/g, '-').toLowerCase() : undefined;

  const secondaryMenuWrapperStyles = css`
    padding: ${euiTheme.size.m};
    position: relative;

    &:not(:last-child) {
      ${highContrastMode
        ? `
        border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
        margin-left: ${euiTheme.size.m};
        margin-right: ${euiTheme.size.m};
        padding-left: 0;
        padding-right: 0;
      `
        : `
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: ${euiTheme.size.m};
          right: ${euiTheme.size.m};
          height: ${euiTheme.border.width.thin};
          background-color: ${euiTheme.colors.borderBaseSubdued};
        }
      `}
    }
  `;

  const labelStyles = css`
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textSubdued};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    display: block;
  `;

  // Same inline padding as items, so the chevron lines up with item labels.
  const showMoreStyles = css`
    padding-inline: ${euiTheme.size.s};
  `;

  const listStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    width: 100%;
  `;

  return (
    <div css={secondaryMenuWrapperStyles} role="group" aria-labelledby={sectionId || undefined}>
      {label && (
        <EuiText id={sectionId} css={labelStyles} component="span">
          {label}
        </EuiText>
      )}
      <ul css={listStyles} ref={listRef} role="none">
        {visibleItems}
        {hasMore && (
          <li role="none">
            <EuiButtonEmpty
              color="text"
              css={showMoreStyles}
              data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-section-${
                id ?? sectionId ?? 'untitled'
              }-showMore`}
              iconType="chevronSingleDown"
              onClick={showMore}
              size="xs"
            >
              {i18n.translate('kbnUI.sideNavigation.section.showMore', {
                defaultMessage: 'Show more',
              })}
            </EuiButtonEmpty>
          </li>
        )}
      </ul>
    </div>
  );
};
