/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiNotificationBadge, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { getBaseConnectorType, TypeIcon } from '../../components/step_icons';

/** Default cap for the combined trigger + step icon strip (overflow shows +N). */
const DEFAULT_MAX_VISIBLE_ICONS = 4;

/** Shared slot so outline icons, brand logos, and the +N badge share one midline. */
const ICON_SLOT_PX = 20;

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
  /**
   * Max icons to show before collapsing the rest into a `+N` badge.
   * Counts triggers and unique step connector types together.
   */
  maxVisible?: number;
}

type IconItem =
  | { readonly kind: 'trigger'; readonly type: string }
  | { readonly kind: 'step'; readonly type: string };

/**
 * Renders the trigger + step icon row on a template card, from the catalog
 * row's `stepTypes` / `triggerTypes` string arrays (`@kbn/workflows-library`
 * `TemplateSchema`). Step types are deduped by base connector type so e.g.
 * `elasticsearch.search` and `elasticsearch.index` render a single icon.
 * Excess icons beyond {@link maxVisible} collapse into a `+N` badge.
 */
export const CatalogTemplateIcons = React.memo<CatalogTemplateIconsProps>(
  ({ stepTypes, triggerTypes, maxVisible = DEFAULT_MAX_VISIBLE_ICONS }) => {
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

    const items = useMemo<IconItem[]>(
      () => [
        ...triggerTypes.map((type) => ({ kind: 'trigger' as const, type })),
        ...uniqueStepTypes.map((type) => ({ kind: 'step' as const, type })),
      ],
      [triggerTypes, uniqueStepTypes]
    );

    // Narrow cards (e.g. three in a row on the create landing) show fewer
    // icons so the row and its "+N" badge stay inside the card.
    const visibleStepCount = getVisibleStepCount(
      rowWidth,
      triggerTypes.length,
      uniqueStepTypes.length,
      {
        icon: ICON_SLOT_PX,
        gap: parseFloat(euiTheme.size.m),
        // The divider's negative margins collapse the flex gap on both sides.
        divider: 1 + 2 * (parseFloat(euiTheme.size.xs) - parseFloat(euiTheme.size.m)),
      }
    );
    const visibleCount = Math.min(maxVisible, triggerTypes.length + visibleStepCount);

    const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
    const overflowCount = items.length - visibleItems.length;

    const iconSlotCss = useMemo(
      () =>
        css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: ICON_SLOT_PX,
          height: ICON_SLOT_PX,
          flexShrink: 0,
          lineHeight: 0,
        }),
      []
    );

    const dividerStyle = useMemo(
      () =>
        css({
          width: 1,
          height: ICON_SLOT_PX,
          flexShrink: 0,
          alignSelf: 'center',
          backgroundColor: euiTheme.colors.borderBaseSubdued,
          // Collapse the flex gap on both sides so trigger|step spacing stays ~12px.
          marginInline: `calc(${euiTheme.size.xs} - ${euiTheme.size.m})`,
        }),
      [euiTheme.size.xs, euiTheme.size.m, euiTheme.colors.borderBaseSubdued]
    );

    if (items.length === 0) {
      return null;
    }

    return (
      <div
        ref={setRowElement}
        data-test-subj="catalogTemplateIcons"
        css={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: euiTheme.size.m,
          minWidth: 0,
          minHeight: ICON_SLOT_PX,
          // Flush with the card content edge so the strip lines up with the title.
          margin: 0,
          padding: 0,
        }}
      >
        {visibleItems.map((item, index) => {
          const prev = visibleItems[index - 1];
          const showDivider = prev?.kind === 'trigger' && item.kind === 'step';
          return (
            <React.Fragment key={`${item.kind}-${item.type}`}>
              {showDivider && (
                <span css={dividerStyle} aria-hidden data-test-subj="catalogTemplateIconsDivider" />
              )}
              <span css={iconSlotCss}>
                <TypeIcon type={item.type} kind={item.kind} />
              </span>
            </React.Fragment>
          );
        })}
        {overflowCount > 0 && (
          <span css={iconSlotCss}>
            <EuiNotificationBadge
              color="subdued"
              title={i18n.translate('workflowsUi.library.templateIcons.overflowTitle', {
                defaultMessage: '{count} more',
                values: { count: overflowCount },
              })}
            >
              {`+${overflowCount}`}
            </EuiNotificationBadge>
          </span>
        )}
      </div>
    );
  }
);
CatalogTemplateIcons.displayName = 'CatalogTemplateIcons';
