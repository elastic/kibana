/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiCard, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import type { Template } from '@kbn/workflows-library';
import { CatalogTemplateIcons } from './catalog_template_icons';

export interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
}

export const TemplateCard = React.memo<TemplateCardProps>(({ template, onSelect }) => {
  const { euiTheme } = useEuiTheme();

  const handleClick = useCallback(() => onSelect(template), [onSelect, template]);

  const title = useMemo(
    () => (
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <CatalogTemplateIcons
            stepTypes={template.stepTypes}
            triggerTypes={template.triggerTypes}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="m" css={css({ fontWeight: euiTheme.font.weight.semiBold })}>
            {template.name}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [template.stepTypes, template.triggerTypes, template.name, euiTheme.font.weight.semiBold]
  );

  const footer = useMemo(
    () =>
      template.categories.length > 0 ? (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {template.categories.map((category) => (
            <EuiFlexItem grow={false} key={category}>
              <EuiBadge color="hollow">{category}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : undefined,
    [template.categories]
  );

  return (
    <EuiCard
      data-test-subj={`workflow-library-template-card-${template.slug}`}
      layout="vertical"
      textAlign="left"
      paddingSize="l"
      onClick={handleClick}
      title={title}
      description={template.description}
      footer={footer}
    />
  );
});
TemplateCard.displayName = 'TemplateCard';
