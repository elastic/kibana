/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import type { Template } from '@kbn/workflows-library';
import { CatalogTemplateIcons } from './catalog_template_icons';
import { TemplateCardTags } from './template_card_tags';

export interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
}

export const TemplateCard = React.memo<TemplateCardProps>(({ template, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  const hoverShadow = useEuiShadow('s');

  // Border-only at rest; a light shadow appears only on hover/keyboard focus.
  // The two logical gaps — logos → (title + description) → tags — both use the
  // `size.l` token so they stay equal. EuiCard styles its footer slot with an
  // Emotion label (class `css-…-euiCard__footer`), so it must be matched with a
  // substring attribute selector, not `.euiCard__footer`.
  const cardCss = useMemo(
    () =>
      css`
        transition: box-shadow ${euiTheme.animation.fast} ease-in;
        &:hover,
        &:focus-within {
          ${hoverShadow}
        }
        [class*='euiCard__footer'] {
          margin-top: ${euiTheme.size.l};
        }
      `,
    [hoverShadow, euiTheme.animation.fast, euiTheme.size.l]
  );

  const handleClick = useCallback(() => onSelect(template), [onSelect, template]);

  const title = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
        <EuiFlexItem grow={false}>
          <CatalogTemplateIcons
            stepTypes={template.stepTypes}
            triggerTypes={template.triggerTypes}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="m"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            `}
          >
            {template.name}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [template.stepTypes, template.triggerTypes, template.name, euiTheme.font.weight.semiBold]
  );

  // Clamp the description to at most two lines; overflow is truncated with an ellipsis.
  const description = useMemo(
    () => (
      <span
        css={css`
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        `}
      >
        {template.description}
      </span>
    ),
    [template.description]
  );

  const footer = useMemo(
    () =>
      template.categories.length > 0 ? (
        <TemplateCardTags categories={template.categories} />
      ) : undefined,
    [template.categories]
  );

  return (
    <EuiCard
      data-test-subj={`workflow-library-template-card-${template.slug}`}
      layout="vertical"
      textAlign="left"
      paddingSize="l"
      hasBorder
      onClick={handleClick}
      title={title}
      description={description}
      footer={footer}
      css={[
        css({
          background: euiTheme.colors.emptyShade,
          borderColor: euiTheme.colors.lightShade,
          borderRadius: euiTheme.border.radius.medium,
          boxShadow: 'none',
          gap: euiTheme.size.l,
          minHeight: 204,
          padding: euiTheme.size.l,
          width: '100%',
        }),
        cardCss,
      ]}
    />
  );
});
TemplateCard.displayName = 'TemplateCard';
