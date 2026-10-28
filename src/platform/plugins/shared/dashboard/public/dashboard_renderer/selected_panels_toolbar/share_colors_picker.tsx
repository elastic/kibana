/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
  type UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import {
  AreaSeries,
  BarSeries,
  Chart,
  LineSeries,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
  type PartialTheme,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { getAssignmentColor, getColorsFromMapping, type ColorMapping } from '@kbn/coloring';
import { useKbnPalettes } from '@kbn/palettes';
import type { PanelMiniChart } from './describe_panel';

const isFocusVisible = (target: EventTarget) => {
  try {
    return (target as Element).matches(':focus-visible');
  } catch {
    return false;
  }
};

export interface ShareColorsPanelPreviewOption {
  id: string;
  /** the panel title, or "Untitled" */
  label: string;
  /** shows `label` as a placeholder rather than a name */
  isUntitled?: boolean;
  /** what the chart shows, below the label */
  description?: string;
  /** the field the chart breaks down by, which decides whether shared colors line up */
  breakdown?: string;
  /** a capture of the rendered panel; the generated mini chart is used until it is available */
  thumbnailUrl?: string;
  miniChart: PanelMiniChart;
}

const strings = {
  getTitle: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.title', {
      defaultMessage: 'Copy colors from which panel?',
    }),
  getDescription: (otherPanels: number) =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.description', {
      defaultMessage:
        'The other {otherPanels, plural, one {selected panel} other {# selected panels}} will use its color mapping.',
      values: { otherPanels },
    }),
  getCancel: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.cancel', {
      defaultMessage: 'Cancel',
    }),
  getApply: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.apply', {
      defaultMessage: 'Apply',
    }),
  getBreakdownLabel: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.breakdownLabel', {
      defaultMessage: 'Breakdown',
    }),
  getPaletteLabel: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.paletteLabel', {
      defaultMessage: 'Palette',
    }),
  getMoreAssignments: (count: number) =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.moreAssignments', {
      defaultMessage: '+{count} more',
      values: { count },
    }),
  getCustomColorsLabel: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.customColorsLabel', {
      defaultMessage: 'Custom colors',
    }),
  getCustomColorsHelp: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColors.customColorsHelp', {
      defaultMessage: 'Colors set for specific values in this chart. Other values use the palette.',
    }),
};

/** How many value → color assignments a card lists before summarizing the rest */
const MAX_ASSIGNMENT_CHIPS = 5;
/** How many of the palette's colors its swatch strip shows */
const MAX_PALETTE_STRIP_COLORS = 10;

/** A readable name for what an assignment matches, e.g. "404", "error*" or "0 – 100" */
const getRuleLabel = (rule: ColorMapping.ColorRule): string | undefined => {
  switch (rule.type) {
    case 'raw': {
      const { value } = rule;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      // multi-field breakdowns store their values as a list of keys
      const keys = (value as { keys?: unknown[] } | undefined)?.keys;
      return Array.isArray(keys) ? keys.map(String).join(' › ') : undefined;
    }
    case 'match':
      return rule.pattern;
    case 'regex':
      return `/${rule.pattern}/`;
    case 'range':
      return `${rule.min} – ${rule.max}`;
    default:
      return undefined;
  }
};

/**
 * What a panel would share, as a short labelled list below its preview: the field it breaks down
 * by (shared colors only line up when the values match), its palette, and its value → color
 * assignments when it has any (that's what makes a value look the same everywhere).
 */
const ColorDetails = ({
  breakdown,
  colorMapping,
  paletteId,
}: Pick<PanelMiniChart, 'colorMapping' | 'paletteId'> & { breakdown?: string }) => {
  const styles = useMemoCss(pickerStyles);
  const palettes = useKbnPalettes();
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';
  const palette = palettes.get(paletteId);

  const assignments = (colorMapping?.assignments ?? []).flatMap((assignment, index, all) => {
    const label = assignment.rules.map(getRuleLabel).filter(Boolean).join(', ');
    if (!label || !colorMapping) return [];
    const color = getAssignmentColor(
      colorMapping.colorMode,
      assignment.color,
      palettes,
      isDarkMode,
      index,
      all.length
    );
    return [{ label, color }];
  });
  const hiddenCount = assignments.length - MAX_ASSIGNMENT_CHIPS;

  return (
    <dl css={styles.details}>
      {breakdown && (
        <>
          <dt>{strings.getBreakdownLabel()}</dt>
          <dd css={styles.detailValue}>{breakdown}</dd>
        </>
      )}
      <dt>{strings.getPaletteLabel()}</dt>
      <dd css={[styles.detailValue, styles.paletteValue]}>
        <span css={styles.paletteStrip} aria-hidden>
          {palette
            .colors()
            .slice(0, MAX_PALETTE_STRIP_COLORS)
            .map((color, index) => (
              <span key={`${color}-${index}`} style={{ backgroundColor: color }} />
            ))}
        </span>
        <span css={styles.truncate}>{palette.name}</span>
      </dd>
      {assignments.length > 0 && (
        <>
          <dt>
            {/* tells the hand-picked colors apart from the palette they override */}
            <EuiToolTip content={strings.getCustomColorsHelp()}>
              <span tabIndex={0} css={styles.helpLabel}>
                {strings.getCustomColorsLabel()}
              </span>
            </EuiToolTip>
          </dt>
          <dd css={styles.detailValue}>
            <ul css={styles.chips}>
              {assignments.slice(0, MAX_ASSIGNMENT_CHIPS).map(({ label, color }, index) => (
                <li key={`${label}-${index}`} css={styles.chip}>
                  <span css={styles.swatch} style={{ backgroundColor: color }} aria-hidden />
                  <span css={styles.truncate}>{label}</span>
                </li>
              ))}
              {hiddenCount > 0 && (
                <li css={[styles.chip, styles.subdued]}>
                  {strings.getMoreAssignments(hiddenCount)}
                </li>
              )}
            </ul>
          </dd>
        </>
      )}
    </dl>
  );
};

const fallbackSeries: PanelMiniChart['series'] = [
  {
    id: 'primary',
    data: [3, 6, 4, 8, 5, 9].map((value, x) => ({ x, value })),
  },
  {
    id: 'secondary',
    data: [6, 4, 7, 5, 8, 6].map((value, x) => ({ x, value })),
  },
];

const miniChartTheme: PartialTheme = {
  chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
  chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
  background: { color: 'transparent' },
  scales: { barsPadding: 0.2 },
};

const MiniChart = ({
  chartType,
  colorMapping,
  paletteId,
  series,
  isHorizontal,
  isStacked,
  showPoints,
}: PanelMiniChart) => {
  const styles = useMemoCss(pickerStyles);
  const palettes = useKbnPalettes();
  const { colorMode, euiTheme } = useEuiTheme();
  const previewSeries = series.length ? series : fallbackSeries;
  const palette = palettes.get(paletteId);
  const colors = colorMapping
    ? getColorsFromMapping(palettes, colorMode === 'DARK', colorMapping)
    : Array.from({ length: previewSeries.length }, (_, index) =>
        palette.getColor(index % palette.colorCount)
      );
  const fallbackColors = [euiTheme.colors.vis.euiColorVis0, euiTheme.colors.vis.euiColorVis1];
  const getSeriesColor = (index: number) =>
    colors[index % colors.length] ?? fallbackColors[index % fallbackColors.length];

  const commonSeriesProps = {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
    xAccessor: 'x',
    yAccessors: ['value'] as string[],
  } as const;

  return (
    <div css={styles.miniChart} aria-hidden>
      <Chart>
        <Settings theme={miniChartTheme} showLegend={false} rotation={isHorizontal ? 90 : 0} />
        <Tooltip type={TooltipType.None} />
        {chartType === 'line' ? (
          <>
            {previewSeries.map(({ id, data }, index) => (
              <LineSeries
                {...commonSeriesProps}
                key={id}
                id={id}
                data={isStacked ? data.map((datum) => ({ ...datum, stack: 'all' })) : data}
                color={getSeriesColor(index)}
                stackAccessors={isStacked ? ['stack'] : undefined}
                lineSeriesStyle={{ point: { visible: showPoints ? 'always' : 'never' } }}
              />
            ))}
          </>
        ) : chartType === 'area' ? (
          <>
            {previewSeries.map(({ id, data }, index) => (
              <AreaSeries
                {...commonSeriesProps}
                key={id}
                id={id}
                data={isStacked ? data.map((datum) => ({ ...datum, stack: 'all' })) : data}
                color={getSeriesColor(index)}
                stackAccessors={isStacked ? ['stack'] : undefined}
                areaSeriesStyle={{ point: { visible: showPoints ? 'always' : 'never' } }}
              />
            ))}
          </>
        ) : (
          <>
            {previewSeries.map(({ id, data }, index) => (
              <BarSeries
                {...commonSeriesProps}
                key={id}
                id={id}
                data={isStacked ? data.map((datum) => ({ ...datum, stack: 'all' })) : data}
                color={getSeriesColor(index)}
                stackAccessors={isStacked ? ['stack'] : undefined}
              />
            ))}
          </>
        )}
      </Chart>
    </div>
  );
};

export const ShareColorsPicker = ({
  panels,
  onApply,
  onCancel,
  onPreviewChange,
}: {
  /** eligible source panels: selected Lens charts with color mapping */
  panels: ShareColorsPanelPreviewOption[];
  onApply: (sourcePanelId: string) => void;
  onCancel: () => void;
  /**
   * Called with the panel whose option is hovered or keyboard-focused (hover wins), or undefined,
   * so the dashboard can point at it. `fromKeyboard` lets the caller scroll it into view.
   */
  onPreviewChange?: (panelId: string | undefined, fromKeyboard: boolean) => void;
}) => {
  const styles = useMemoCss(pickerStyles);
  const titleId = useGeneratedHtmlId({ prefix: 'dashboardShareColorsTitle' });
  const [sourcePanelId, setSourcePanelId] = useState<string | undefined>();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // move focus into the question so keyboard and screen reader users land in the new content
  useEffect(() => {
    containerRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
  }, []);

  // which option points at a panel: hover takes precedence over keyboard focus
  const [hoveredId, setHoveredId] = useState<string | undefined>();
  const [focusedId, setFocusedId] = useState<string | undefined>();
  useEffect(() => {
    onPreviewChange?.(hoveredId ?? focusedId, hoveredId === undefined && focusedId !== undefined);
  }, [hoveredId, focusedId, onPreviewChange]);
  useEffect(() => () => onPreviewChange?.(undefined, false), [onPreviewChange]);

  return (
    <EuiFlyout
      onClose={onCancel}
      size={500}
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="dashboardShareColorsPicker"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{strings.getTitle()}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>{strings.getDescription(panels.length - 1)}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {/* leaving the list stops pointing at a panel, even from the gaps between options */}
        <div
          onMouseLeave={() => setHoveredId(undefined)}
          data-test-subj="dashboardShareColorsSources"
        >
          <div ref={containerRef} role="radiogroup" aria-labelledby={titleId}>
            {panels.map(
              ({ id, label, isUntitled, description, breakdown, thumbnailUrl, miniChart }) => (
                <div
                  key={id}
                  css={styles.option}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId(undefined)}
                  onFocus={(event) => setFocusedId(isFocusVisible(event.target) ? id : undefined)}
                  onKeyUp={(event) => {
                    if (isFocusVisible(event.target)) setFocusedId(id);
                  }}
                  onBlur={() => setFocusedId(undefined)}
                >
                  <EuiCheckableCard
                    id={id}
                    name={`${titleId}-source`}
                    checkableType="radio"
                    checked={sourcePanelId === id}
                    onChange={() => setSourcePanelId(id)}
                    label={
                      <div css={styles.optionContent}>
                        <span css={styles.optionText}>
                          <EuiTitle size="xxs">
                            <h3 css={[styles.optionLabel, isUntitled && styles.untitled]}>
                              {label}
                            </h3>
                          </EuiTitle>
                          {description && (
                            <EuiText
                              size="xs"
                              color="subdued"
                              component="span"
                              css={styles.optionLabel}
                            >
                              {description}
                            </EuiText>
                          )}
                        </span>
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt=""
                            css={[styles.miniChart, styles.thumbnail]}
                          />
                        ) : (
                          <MiniChart {...miniChart} />
                        )}
                        <ColorDetails
                          breakdown={breakdown}
                          colorMapping={miniChart.colorMapping}
                          paletteId={miniChart.paletteId}
                        />
                      </div>
                    }
                    data-test-subj={`dashboardShareColorsSource-${id}`}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={onCancel} data-test-subj="dashboardShareColorsCancel">
              {strings.getCancel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              isDisabled={!sourcePanelId}
              onClick={() => sourcePanelId && onApply(sourcePanelId)}
              data-test-subj="dashboardShareColorsApply"
            >
              {strings.getApply()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const pickerStyles = {
  option: ({ euiTheme }: UseEuiTheme) => ({
    marginBlockEnd: euiTheme.size.m,
  }),
  optionContent: ({ euiTheme }: UseEuiTheme) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'stretch' as const,
    gap: euiTheme.size.s,
    width: '100%',
  }),
  optionText: ({ euiTheme }: UseEuiTheme) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: euiTheme.size.xs,
    minWidth: 0,
  }),
  miniChart: ({ euiTheme }: UseEuiTheme) => ({
    width: '100%',
    // the color row carries the details, so the chart is just a reminder of the panel's shape
    height: 88,
    overflow: 'hidden',
    borderRadius: euiTheme.border.radius.small,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  }),
  // a compact two-column list, set apart from the preview by a hairline
  details: ({ euiTheme }: UseEuiTheme) => ({
    display: 'grid',
    gridTemplateColumns: 'max-content minmax(0, 1fr)',
    alignItems: 'center' as const,
    columnGap: euiTheme.size.base,
    rowGap: euiTheme.size.s,
    margin: 0,
    paddingBlockStart: euiTheme.size.m,
    borderBlockStart: euiTheme.border.thin,
    fontSize: euiTheme.font.scale.xs * euiTheme.base,
    lineHeight: euiTheme.size.base,
    dt: {
      color: euiTheme.colors.textSubdued,
      fontWeight: euiTheme.font.weight.semiBold,
    },
  }),
  detailValue: {
    margin: 0,
    minWidth: 0,
    overflowWrap: 'anywhere' as const,
  },
  paletteValue: ({ euiTheme }: UseEuiTheme) => ({
    display: 'flex',
    alignItems: 'center' as const,
    gap: euiTheme.size.s,
  }),
  paletteStrip: ({ euiTheme }: UseEuiTheme) => ({
    display: 'flex',
    flexShrink: 0,
    width: euiTheme.size.xxxl,
    height: euiTheme.size.s,
    overflow: 'hidden',
    borderRadius: euiTheme.border.radius.small,
    '> span': { flex: 1 },
  }),
  chips: ({ euiTheme }: UseEuiTheme) => ({
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: `${euiTheme.size.xs} ${euiTheme.size.m}`,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  }),
  chip: ({ euiTheme }: UseEuiTheme) => ({
    display: 'inline-flex',
    alignItems: 'center' as const,
    gap: euiTheme.size.xs,
    minWidth: 0,
    maxWidth: '100%',
  }),
  swatch: ({ euiTheme }: UseEuiTheme) => ({
    flexShrink: 0,
    width: euiTheme.size.s,
    height: euiTheme.size.s,
    borderRadius: '50%',
    // keeps very light colors visible against the card
    boxShadow: `inset 0 0 0 ${euiTheme.border.width.thin} ${euiTheme.colors.borderBaseSubdued}`,
  }),
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  // a dotted underline hints that the label explains itself on hover or focus
  helpLabel: ({ euiTheme }: UseEuiTheme) => ({
    textDecoration: 'underline dotted',
    textUnderlineOffset: euiTheme.size.xxs,
    cursor: 'help',
  }),
  subdued: ({ euiTheme }: UseEuiTheme) => ({
    color: euiTheme.colors.textSubdued,
  }),
  thumbnail: {
    display: 'block',
    objectFit: 'contain' as const,
  },
  untitled: ({ euiTheme }: UseEuiTheme) => ({
    color: euiTheme.colors.textSubdued,
  }),
  // long names wrap instead of widening the toolbar
  optionLabel: {
    display: 'block',
    overflowWrap: 'anywhere' as const,
  },
};
