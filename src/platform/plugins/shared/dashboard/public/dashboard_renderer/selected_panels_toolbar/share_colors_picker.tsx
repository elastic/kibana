/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type IconType,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

const isFocusVisible = (target: EventTarget) => {
  try {
    return (target as Element).matches(':focus-visible');
  } catch {
    return false;
  }
};

export interface ShareColorsPanelOption {
  id: string;
  /** the panel title, or "Untitled" */
  label: string;
  /** shows `label` as a placeholder rather than a name */
  isUntitled?: boolean;
  /** what the chart shows, below the label */
  description?: string;
  icon: IconType;
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
};

/**
 * Takes over the selected panels toolbar to pick which panel's colors the other selected panels
 * should use.
 */
export const ShareColorsPicker = ({
  panels,
  onApply,
  onCancel,
  onPreviewChange,
}: {
  /** eligible source panels: selected Lens charts with color mapping */
  panels: ShareColorsPanelOption[];
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

  // EuiRadio uses the option id as the input id
  const getOptionId = useCallback(
    (target: EventTarget | null) =>
      (target as HTMLElement | null)
        ?.closest('.euiRadioGroup__item')
        ?.querySelector<HTMLInputElement>('input[type="radio"]')?.id,
    []
  );

  return (
    <div
      ref={containerRef}
      css={styles.picker}
      role="group"
      aria-labelledby={titleId}
      data-test-subj="dashboardShareColorsPicker"
    >
      <EuiTitle size="xxs">
        <h3 id={titleId}>{strings.getTitle()}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>{strings.getDescription(panels.length - 1)}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiRadioGroup
        name={`${titleId}-source`}
        options={panels.map(({ id, label, isUntitled, description, icon }) => ({
          id,
          label: (
            <span css={styles.option}>
              <EuiIcon type={icon} color="subdued" css={styles.optionIcon} aria-hidden />
              <span>
                <span css={[styles.optionLabel, isUntitled && styles.untitled]}>{label}</span>
                {description && (
                  <EuiText size="xs" color="subdued" component="span" css={styles.optionLabel}>
                    {description}
                  </EuiText>
                )}
              </span>
            </span>
          ),
          'data-test-subj': `dashboardShareColorsSource-${id}`,
        }))}
        idSelected={sourcePanelId}
        onChange={(id) => setSourcePanelId(id)}
        aria-labelledby={titleId}
        onMouseOver={(e) => setHoveredId(getOptionId(e.target))}
        onMouseLeave={() => setHoveredId(undefined)}
        // only keyboard focus points at a panel: the automatic focus when the picker opens and
        // focus from clicking an option must not leave a panel highlighted
        onFocus={(e) => setFocusedId(isFocusVisible(e.target) ? getOptionId(e.target) : undefined)}
        onKeyUp={(e) => {
          if (isFocusVisible(e.target)) setFocusedId(getOptionId(e.target));
        }}
        onBlur={() => setFocusedId(undefined)}
        css={styles.options}
        data-test-subj="dashboardShareColorsSources"
      />
      <EuiSpacer size="m" />
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
    </div>
  );
};

const pickerStyles = {
  picker: ({ euiTheme }: UseEuiTheme) => ({
    padding: `${euiTheme.size.xs} ${euiTheme.size.xs} 0`,
  }),
  options: ({ euiTheme }: UseEuiTheme) => ({
    '.euiRadioGroup__item': { marginBlockEnd: euiTheme.size.s },
  }),
  option: ({ euiTheme }: UseEuiTheme) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: euiTheme.size.s,
  }),
  optionIcon: ({ euiTheme }: UseEuiTheme) => ({
    flexShrink: 0,
    marginBlockStart: euiTheme.size.xxs,
  }),
  untitled: ({ euiTheme }: UseEuiTheme) => ({
    color: euiTheme.colors.textSubdued,
  }),
  // long names wrap instead of widening the toolbar
  optionLabel: {
    display: 'block',
    overflowWrap: 'anywhere' as const,
  },
};
