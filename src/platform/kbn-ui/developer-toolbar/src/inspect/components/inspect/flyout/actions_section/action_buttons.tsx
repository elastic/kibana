/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCard, EuiFlexGroup, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { InspectSourceLink } from '../../../../types';

interface Props {
  links: InspectSourceLink[];
}

export const ActionButtons = ({ links }: Props) => {
  const { euiTheme } = useEuiTheme();

  if (links.length === 0) {
    return null;
  }

  const iconCss = css`
    margin-block-end: ${euiTheme.size.s};
  `;

  const titleCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <EuiFlexGroup gutterSize="m" wrap={true} data-test-subj="inspectComponentActionButtons">
      {links.map(({ href, iconType, id, label }, index) => {
        const isLastOdd = index === links.length - 1 && links.length % 2 !== 0;

        const cardCss = css({
          [`@media (min-width: ${euiTheme.breakpoint.m}px)`]: {
            flex: `0 1 calc(50% - ${euiTheme.size.m})`,
            maxWidth: `calc(50% - ${euiTheme.size.m})`,
            ...(isLastOdd && {
              marginLeft: 'auto',
              marginRight: 'auto',
            }),
          },
        });

        const ariaLabel = i18n.translate(
          'kbnUI.developerToolbar.inspect.inspectFlyout.actionsSection.openFileInAriaLabel',
          {
            defaultMessage: 'Open file using {target}',
            values: { target: label },
          }
        );

        return (
          <EuiCard
            data-test-subj={`inspectComponentActionButton-${id}`}
            key={id}
            aria-label={ariaLabel}
            href={href}
            css={cardCss}
            layout="vertical"
            icon={<EuiIcon type={iconType} size="xxl" css={iconCss} aria-hidden={true} />}
            title={
              <EuiText color={euiTheme.colors.textPrimary} component="span" css={titleCss}>
                {label}
              </EuiText>
            }
            titleSize="s"
            target="_blank"
          />
        );
      })}
    </EuiFlexGroup>
  );
};
