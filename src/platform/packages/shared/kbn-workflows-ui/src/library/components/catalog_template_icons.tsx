/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { getBaseConnectorType, TypeIcon } from '../../components/step_icons';

const MAX_VISIBLE_STEP_ICONS = 4;
// Rough "+N" badge width: horizontal padding plus one character per glyph.
const getOverflowBadgeWidth = (count: number): number => 8 + 8 * `+${count}`.length;

interface RowSizes {
  icon: number;
  gap: number;
  divider: number;
}

/**
 * Picks how many step icons fit in `width`, reserving room for the "+N"
 * badge when some are hidden. Returns the cap when the width is unknown.
 */
export const getVisibleStepCount = (
  width: number,
  triggerCount: number,
  stepCount: number,
  { icon, gap, divider }: RowSizes
): number => {
  const maxCount = Math.min(stepCount, MAX_VISIBLE_STEP_ICONS);
  if (width <= 0) return maxCount;

  for (let count = maxCount; count > 0; count--) {
    const hidden = stepCount - count;
    const widths = [
      ...Array(triggerCount + count).fill(icon),
      ...(triggerCount > 0 ? [divider] : []),
      ...(hidden > 0 ? [getOverflowBadgeWidth(hidden)] : []),
    ];
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
    if (total <= width) return count;
  }
  return 1;
};

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
    const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null);
    const { width: rowWidth } = useResizeObserver(rowElement, 'width');

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

    // Narrow cards (e.g. three in a row on the create landing) show fewer
    // icons so the row and its "+N" badge stay inside the card.
    const visibleStepCount = getVisibleStepCount(
      rowWidth,
      triggerTypes.length,
      uniqueStepTypes.length,
      {
        icon: parseFloat(euiTheme.size.base),
        gap: parseFloat(euiTheme.size.m),
        divider: 1 + 2 * parseFloat(euiTheme.size.xs),
      }
    );
    const visibleStepTypes = useMemo(
      () => uniqueStepTypes.slice(0, visibleStepCount),
      [uniqueStepTypes, visibleStepCount]
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
      <div ref={setRowElement}>
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
            // Keep the badge from shrinking, or a narrow card wraps "+N" onto two lines.
            <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
              <EuiNotificationBadge
                color="subdued"
                title={i18n.translate('workflowsUi.library.templateIcons.overflowTitle', {
                  defaultMessage: '{count} more step types',
                  values: { count: overflowCount },
                })}
              >
                {`+${overflowCount}`}
              </EuiNotificationBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    );
  }
);
CatalogTemplateIcons.displayName = 'CatalogTemplateIcons';
