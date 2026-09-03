/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject, ReactElement } from 'react';
import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import useMountedState from 'react-use/lib/useMountedState';
import useMount from 'react-use/lib/useMount';
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import { VIEW_MODE } from '../../../common/constants';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { HitsCounter, type HitsCounterVariant } from '../hits_counter';

export interface RenderViewModeToggleOptions {
  /** Filled in by the (cross-plugin) Pattern Analysis tab once it knows how many patterns it found. */
  patternCount?: number;
  /** Lets a caller like the ES|QL cascade layout ask for "groups" wording instead of the default documents/results. */
  hitsCounterVariant?: HitsCounterVariant;
}

/** Builds a `DocumentViewModeToggle` element. */
export type RenderViewModeToggle = (options?: RenderViewModeToggleOptions) => ReactElement;

export const DocumentViewModeToggle = ({
  viewMode,
  isEsqlMode,
  prepend,
  setDiscoverViewMode,
  patternCount,
  fieldsCount,
  hitsCounterVariant,
  dataView,
  focusOnMountRef,
}: {
  viewMode: VIEW_MODE;
  isEsqlMode: boolean;
  prepend?: ReactElement;
  setDiscoverViewMode: (viewMode: VIEW_MODE, replace?: boolean) => Promise<VIEW_MODE>;
  patternCount?: number;
  fieldsCount?: number;
  hitsCounterVariant?: HitsCounterVariant;
  dataView: DataView;
  focusOnMountRef: MutableRefObject<boolean>;
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    uiSettings,
    dataVisualizer: dataVisualizerService,
    aiops: aiopsService,
  } = useDiscoverServices();

  const [showPatternAnalysisTab, setShowPatternAnalysisTab] = useState<boolean | null>(null);
  const showFieldStatisticsTab = useMemo(
    () =>
      // If user opens saved search with field stats in ES|QL,
      // we show the toggle with the mode disabled so user can switch to document view
      // instead of auto-directing
      (viewMode === VIEW_MODE.AGGREGATED_LEVEL && isEsqlMode) ||
      (!isEsqlMode && uiSettings.get(SHOW_FIELD_STATISTICS) && dataVisualizerService !== undefined),
    [dataVisualizerService, uiSettings, isEsqlMode, viewMode]
  );

  const isMounted = useMountedState();
  const setShowPatternAnalysisTabWrapper = useCallback(
    (value: boolean) => {
      if (isMounted()) {
        setShowPatternAnalysisTab(value);
      }
    },
    [isMounted]
  );

  useEffect(
    function checkForPatternAnalysis() {
      if (!aiopsService || isEsqlMode) {
        setShowPatternAnalysisTab(false);
        return;
      }
      aiopsService
        .getPatternAnalysisAvailable()
        .then((patternAnalysisAvailable) => {
          const available = patternAnalysisAvailable(dataView);
          setShowPatternAnalysisTabWrapper(available);
        })
        .catch(() => setShowPatternAnalysisTabWrapper(false));
    },
    [aiopsService, dataView, isEsqlMode, setShowPatternAnalysisTabWrapper]
  );

  useEffect(() => {
    if (showPatternAnalysisTab === false && viewMode === VIEW_MODE.PATTERN_LEVEL) {
      // switch to document view if no text fields are available
      setDiscoverViewMode(VIEW_MODE.DOCUMENT_LEVEL, true);
    }
  }, [showPatternAnalysisTab, viewMode, setDiscoverViewMode]);

  useEffect(() => {
    if (viewMode === VIEW_MODE.AGGREGATED_LEVEL && isEsqlMode) {
      setDiscoverViewMode(VIEW_MODE.DOCUMENT_LEVEL, true);
    }
  }, [viewMode, isEsqlMode, setDiscoverViewMode]);

  const includesNormalTabsStyle = viewMode === VIEW_MODE.AGGREGATED_LEVEL;
  const containerPadding = includesNormalTabsStyle ? euiTheme.size.s : 0;
  const containerCss = css`
    padding: ${containerPadding} ${containerPadding} 0 ${containerPadding};
  `;

  const options = useMemo<SelectableEntry[]>(() => {
    const entries: SelectableEntry[] = [
      {
        key: VIEW_MODE.DOCUMENT_LEVEL,
        value: VIEW_MODE.DOCUMENT_LEVEL,
        label: isEsqlMode
          ? i18n.translate('discover.viewModes.esql.label', { defaultMessage: 'Results' })
          : i18n.translate('discover.viewModes.document.label', { defaultMessage: 'Documents' }),
        checked: viewMode === VIEW_MODE.DOCUMENT_LEVEL ? 'on' : undefined,
        'data-test-subj': 'dscViewModeDocumentOption',
      },
    ];

    if (showPatternAnalysisTab) {
      entries.push({
        key: VIEW_MODE.PATTERN_LEVEL,
        value: VIEW_MODE.PATTERN_LEVEL,
        label: i18n.translate('discover.viewModes.patternAnalysis.label', {
          defaultMessage: 'Patterns',
        }),
        checked: viewMode === VIEW_MODE.PATTERN_LEVEL ? 'on' : undefined,
        'data-test-subj': 'dscViewModePatternAnalysisOption',
      });
    }

    if (showFieldStatisticsTab) {
      entries.push({
        key: VIEW_MODE.AGGREGATED_LEVEL,
        value: VIEW_MODE.AGGREGATED_LEVEL,
        label: i18n.translate('discover.viewModes.fieldStatistics.label', {
          defaultMessage: 'Field statistics',
        }),
        disabled: isEsqlMode,
        checked: viewMode === VIEW_MODE.AGGREGATED_LEVEL ? 'on' : undefined,
        'data-test-subj': 'dscViewModeFieldStatsOption',
      });
    }

    return entries;
  }, [showPatternAnalysisTab, showFieldStatisticsTab, viewMode, isEsqlMode]);

  const onChange = useCallback(
    (chosen?: SelectableEntry) => {
      if (chosen?.value) {
        setDiscoverViewMode(chosen.value as VIEW_MODE);
      }
    },
    [setDiscoverViewMode]
  );

  const countDisplay = useMemo(() => {
    if (viewMode === VIEW_MODE.PATTERN_LEVEL) {
      const isLoading = patternCount === undefined;
      return (
        <CountLabel
          label={
            isLoading
              ? i18n.translate('discover.viewModes.patternAnalysis.countLoadingLabel', {
                  defaultMessage: 'patterns',
                })
              : i18n.translate('discover.viewModes.patternAnalysis.countLabel', {
                  defaultMessage: '{count} {count, plural, one {pattern} other {patterns}}',
                  values: { count: patternCount },
                })
          }
          isLoading={isLoading}
          data-test-subj="dscViewModePatternCount"
        />
      );
    }

    if (viewMode === VIEW_MODE.AGGREGATED_LEVEL) {
      const isLoading = fieldsCount === undefined;
      return (
        <CountLabel
          label={
            isLoading
              ? i18n.translate('discover.viewModes.fieldStatistics.countLoadingLabel', {
                  defaultMessage: 'fields',
                })
              : i18n.translate('discover.viewModes.fieldStatistics.countLabel', {
                  defaultMessage: '{count} {count, plural, one {field} other {fields}}',
                  values: { count: fieldsCount },
                })
          }
          isLoading={isLoading}
          data-test-subj="dscViewModeFieldsCount"
        />
      );
    }

    return <HitsCounter variant={hitsCounterVariant ?? (isEsqlMode ? 'results' : 'documents')} />;
  }, [viewMode, patternCount, fieldsCount, isEsqlMode, hitsCounterVariant]);

  // if neither the pattern analysis nor field statistics view is available, there's only
  // one possible view (Documents/Results), so there's nothing to select between
  const showViewModeSelector = Boolean(showFieldStatisticsTab || showPatternAnalysisTab);

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={containerCss}
    >
      {prepend && (
        <EuiFlexItem
          grow={false}
          css={css`
            &:empty {
              display: none;
            }
          `}
        >
          {prepend}
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>{countDisplay}</EuiFlexItem>
      {showViewModeSelector && (
        <>
          <EuiFlexItem grow={false}>
            <span
              aria-hidden="true"
              css={{
                height: 20,
                width: euiTheme.border.width.thin,
                backgroundColor: euiTheme.border.color,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ViewModeSelector
              data-test-subj="dscViewModeToggle"
              data-selected-value={viewMode}
              options={options}
              onChange={onChange}
              focusOnMountRef={focusOnMountRef}
            />
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};

const CountLabel = ({
  label,
  isLoading,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  isLoading: boolean;
  'data-test-subj'?: string;
}) => {
  return (
    <EuiText size="s" data-test-subj={isLoading ? undefined : dataTestSubj}>
      {isLoading ? (
        <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <strong>{label}</strong>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <strong>{label}</strong>
      )}
    </EuiText>
  );
};

const viewAsLabel = i18n.translate('discover.viewModes.viewAsLabel', {
  defaultMessage: 'View as',
});

const selectViewLabel = i18n.translate('discover.viewModes.popoverTitle', {
  defaultMessage: 'Select view',
});

const ViewModeSelector = ({
  'data-test-subj': dataTestSubj,
  'data-selected-value': dataSelectedValue,
  options,
  onChange,
  focusOnMountRef,
}: {
  'data-test-subj': string;
  'data-selected-value': string;
  options: SelectableEntry[];
  onChange: (chosen?: SelectableEntry) => void;
  focusOnMountRef: MutableRefObject<boolean>;
}) => {
  const { euiTheme } = useEuiTheme();
  const popoverTitleId = useGeneratedHtmlId();
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((wasOpen) => !wasOpen), []);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const onSelectionChange = useCallback(
    (newOptions: SelectableEntry[]) => {
      const chosenOption = newOptions.find(({ checked }) => checked === 'on');
      onChange(chosenOption);
      closePopover();
      // a view swap may unmount this button; flag the next one to take over focus
      focusOnMountRef.current = true;
    },
    [closePopover, onChange, focusOnMountRef]
  );

  // widen the panel to fit the longest option label, rather than truncating it
  const panelWidth = useMemo(() => {
    return calculateWidthFromEntries(options, ['label'], {
      paddingsWidth: 2 * euiTheme.base,
    });
  }, [euiTheme.base, options]);

  useMount(() => {
    if (focusOnMountRef.current) {
      focusOnMountRef.current = false;
      buttonRef.current?.focus();
    }
  });

  return (
    <EuiPopover
      id={dataTestSubj}
      ownFocus
      aria-labelledby={popoverTitleId}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelProps={{ css: { width: panelWidth } }}
      button={
        <EuiButtonEmpty
          size="s"
          flush="both"
          buttonRef={buttonRef}
          data-test-subj={`${dataTestSubj}Button`}
          data-selected-value={dataSelectedValue}
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={togglePopover}
        >
          {viewAsLabel}
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={closePopover}
    >
      <EuiPopoverTitle paddingSize="s" id={popoverTitleId}>
        {selectViewLabel}
      </EuiPopoverTitle>
      <EuiSelectable<SelectableEntry>
        id={`${dataTestSubj}Selectable`}
        singleSelection
        aria-label={selectViewLabel}
        data-test-subj={`${dataTestSubj}Selectable`}
        options={options}
        onChange={onSelectionChange}
        listProps={{ showIcons: false, paddingSize: 's' }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
