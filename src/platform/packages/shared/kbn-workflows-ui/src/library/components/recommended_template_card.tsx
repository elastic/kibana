/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip, useEuiShadow, useEuiTheme } from '@elastic/eui';
import React from 'react';
import type { Template } from '@kbn/workflows-library';
import { CatalogTemplateIcons } from './catalog_template_icons';
import type { RecommendationReason } from '../lib/recommend_templates';

const DESCRIPTION_LINE_CLAMP = 2;

export interface RecommendedTemplateCardProps {
  readonly template: Template;
  readonly reason: RecommendationReason;
  readonly onSelect: (template: Template) => void;
  readonly isApplying?: boolean;
  readonly 'data-test-subj'?: string;
}

/**
 * Compact template card for empty-state recommendations (creation panel and
 * list-page empty state). Renders icon strip, name, description, and an honest
 * reason line sourced from recommendation metadata.
 */
export function RecommendedTemplateCard({
  template,
  reason,
  onSelect,
  isApplying = false,
  'data-test-subj': dataTestSubj = `recommendedTemplateCard-${template.slug}`,
}: RecommendedTemplateCardProps) {
  const { euiTheme } = useEuiTheme();
  // Match creation-panel AI prompt + "Start with a trigger" (`useEuiShadow('s')`).
  const cardShadow = useEuiShadow('s');

  return (
    <button
      type="button"
      data-test-subj={dataTestSubj}
      disabled={isApplying}
      onClick={() => onSelect(template)}
      title={template.description}
      css={[
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: euiTheme.size.s,
          textAlign: 'left',
          background: euiTheme.colors.backgroundBasePlain,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          borderRadius: euiTheme.border.radius.medium,
          padding: euiTheme.size.m,
          cursor: 'pointer',
          width: '100%',
          minWidth: 0,
          height: '100%',
          boxSizing: 'border-box',
          '&:hover': {
            borderColor: euiTheme.colors.borderBaseProminent,
            background: euiTheme.colors.backgroundBaseSubdued,
          },
          '&:disabled': { opacity: 0.6, cursor: 'wait' },
        },
        cardShadow,
      ]}
    >
      <CatalogTemplateIcons stepTypes={template.stepTypes} triggerTypes={template.triggerTypes} />
      <span
        css={{
          // Borealis semiBold is 500; bold (600) matches creation-panel titles.
          fontWeight: euiTheme.font.weight.bold,
          color: euiTheme.colors.textHeading,
          fontSize: euiTheme.size.m,
          lineHeight: 1.3,
          width: '100%',
          margin: 0,
          padding: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {template.name}
      </span>
      <span
        css={{
          fontSize: 12,
          color: euiTheme.colors.textSubdued,
          lineHeight: 1.4,
          width: '100%',
          margin: 0,
          padding: 0,
          display: '-webkit-box',
          WebkitLineClamp: DESCRIPTION_LINE_CLAMP,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {template.description}
      </span>
      <EuiToolTip content={reason.tooltip} disableScreenReaderOutput>
        <span
          data-test-subj={`${dataTestSubj}-reason`}
          css={{
            fontSize: 11,
            color: euiTheme.colors.textSubdued,
            fontStyle: 'italic',
            marginTop: 'auto',
            paddingTop: euiTheme.size.xs,
            textDecoration: 'underline dotted',
            textUnderlineOffset: 2,
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {reason.label}
        </span>
      </EuiToolTip>
    </button>
  );
}
