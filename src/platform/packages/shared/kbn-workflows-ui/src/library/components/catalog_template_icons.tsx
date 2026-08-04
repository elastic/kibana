/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { getBaseConnectorType, TypeIcon } from '../../components/step_icons';

const MAX_VISIBLE_STEP_ICONS = 4;

export interface CatalogTemplateIconsProps {
  stepTypes: string[];
  triggerTypes: string[];
}

/**
 * Renders the trigger + step icon row on a template card, from the catalog
 * row's `stepTypes` / `triggerTypes` string arrays (`@kbn/workflows-library`
 * `TemplateSchema`). Step types are deduped by base connector type so e.g.
 * `elasticsearch.search` and `elasticsearch.index` render a single icon.
 */
export const CatalogTemplateIcons = React.memo<CatalogTemplateIconsProps>(
  ({ stepTypes, triggerTypes }) => {
    const { euiTheme } = useEuiTheme();

    // Dedupe step icons by base connector type (so `elasticsearch.search` and
    // `elasticsearch.index` render one icon) while keeping the first raw step
    // type of each family so the icon tooltip shows the full type string.
    const uniqueStepTypes = useMemo(() => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const stepType of stepTypes) {
        const baseType = getBaseConnectorType(stepType);
        if (!seen.has(baseType)) {
          seen.add(baseType);
          result.push(stepType);
        }
      }
      return result;
    }, [stepTypes]);

    const visibleStepTypes = useMemo(
      () => uniqueStepTypes.slice(0, MAX_VISIBLE_STEP_ICONS),
      [uniqueStepTypes]
    );
    const overflowCount = uniqueStepTypes.length - visibleStepTypes.length;

    const dividerStyle = useMemo(
      () => css`
        margin: 0 ${euiTheme.size.xs} 0 ${euiTheme.size.xs};
        border-left: 1px solid ${euiTheme.colors.borderBaseSubdued};
        height: ${euiTheme.size.base};
      `,
      [euiTheme.size.xs, euiTheme.size.base, euiTheme.colors.borderBaseSubdued]
    );

    if (triggerTypes.length === 0 && uniqueStepTypes.length === 0) {
      return null;
    }

    const hasDivider = triggerTypes.length > 0 && visibleStepTypes.length > 0;

    return (
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        responsive={false}
        wrap={false}
        // 12px between logos (8px + 4px); no gutter token for 12px.
        css={{ gap: euiTheme.size.m }}
      >
        {triggerTypes.map((triggerType) => (
          <EuiFlexItem grow={false} key={`trigger-${triggerType}`}>
            <TypeIcon type={triggerType} kind="trigger" />
          </EuiFlexItem>
        ))}
        {hasDivider && <EuiFlexItem grow={false} css={dividerStyle} />}
        {visibleStepTypes.map((stepType) => (
          <EuiFlexItem grow={false} key={`step-${stepType}`}>
            <TypeIcon type={stepType} kind="step" />
          </EuiFlexItem>
        ))}
        {overflowCount > 0 && (
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge
              color="subdued"
              title={i18n.translate('workflows.library.templateIcons.overflowTitle', {
                defaultMessage: '{count} more step types',
                values: { count: overflowCount },
              })}
            >
              {`+${overflowCount}`}
            </EuiNotificationBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
CatalogTemplateIcons.displayName = 'CatalogTemplateIcons';
