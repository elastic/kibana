/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import useMountedState from 'react-use/lib/useMountedState';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { VIEW_MODE } from '../../../common/constants';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { HitsCounter, type HitsCounterVariant } from '../hits_counter';

export const DocumentViewModeToggle = ({
  viewMode,
  isEsqlMode,
  prepend,
  setDiscoverViewMode,
  patternCount,
  fieldsCount,
  hitsCounterVariant,
  dataView,
}: {
  viewMode: VIEW_MODE;
  isEsqlMode: boolean;
  prepend?: ReactElement;
  setDiscoverViewMode: (viewMode: VIEW_MODE, replace?: boolean) => Promise<VIEW_MODE>;
  patternCount?: number;
  fieldsCount?: number;
  hitsCounterVariant?: HitsCounterVariant;
  dataView: DataView;
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

  const documentsLabel = isEsqlMode
    ? i18n.translate('discover.viewModes.esql.label', { defaultMessage: 'Results' })
    : i18n.translate('discover.viewModes.document.label', { defaultMessage: 'Documents' });
  const patternsLabel = i18n.translate('discover.viewModes.patternAnalysis.label', {
    defaultMessage: 'Patterns',
  });
  const fieldStatisticsLabel = i18n.translate('discover.viewModes.fieldStatistics.label', {
    defaultMessage: 'Field statistics',
  });

  const options = useMemo<SelectableEntry[]>(() => {
    const entries: SelectableEntry[] = [
      {
        key: VIEW_MODE.DOCUMENT_LEVEL,
        value: VIEW_MODE.DOCUMENT_LEVEL,
        label: documentsLabel,
        prepend: <EuiIcon type="table" aria-hidden={true} />,
        checked: viewMode === VIEW_MODE.DOCUMENT_LEVEL ? 'on' : undefined,
        'data-test-subj': 'dscViewModeDocumentOption',
      },
    ];

    if (showPatternAnalysisTab) {
      entries.push({
        key: VIEW_MODE.PATTERN_LEVEL,
        value: VIEW_MODE.PATTERN_LEVEL,
        label: patternsLabel,
        prepend: <EuiIcon type="pattern" aria-hidden={true} />,
        checked: viewMode === VIEW_MODE.PATTERN_LEVEL ? 'on' : undefined,
        'data-test-subj': 'dscViewModePatternAnalysisOption',
      });
    }

    if (showFieldStatisticsTab) {
      entries.push({
        key: VIEW_MODE.AGGREGATED_LEVEL,
        value: VIEW_MODE.AGGREGATED_LEVEL,
        label: fieldStatisticsLabel,
        prepend: <EuiIcon type="stats" aria-hidden={true} />,
        disabled: isEsqlMode,
        checked: viewMode === VIEW_MODE.AGGREGATED_LEVEL ? 'on' : undefined,
        'data-test-subj': 'dscViewModeFieldStatsOption',
      });
    }

    return entries;
  }, [
    documentsLabel,
    patternsLabel,
    fieldStatisticsLabel,
    showPatternAnalysisTab,
    showFieldStatisticsTab,
    viewMode,
    isEsqlMode,
  ]);

  const [buttonIcon, buttonText] =
    viewMode === VIEW_MODE.PATTERN_LEVEL
      ? ['pattern', patternsLabel]
      : viewMode === VIEW_MODE.AGGREGATED_LEVEL
      ? ['stats', fieldStatisticsLabel]
      : ['tableDensityHigh', documentsLabel];

  const buttonLabel = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={buttonIcon} aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>{buttonText}</EuiFlexItem>
    </EuiFlexGroup>
  );

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
      return patternCount === undefined ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiText size="s" data-test-subj="dscViewModePatternCount">
          <strong>
            <FormattedMessage
              id="discover.viewModes.patternAnalysis.countLabel"
              defaultMessage="{count} {count, plural, one {pattern} other {patterns}}"
              values={{ count: patternCount }}
            />
          </strong>
        </EuiText>
      );
    }

    if (viewMode === VIEW_MODE.AGGREGATED_LEVEL) {
      return fieldsCount === undefined ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiText size="s" data-test-subj="dscViewModeFieldsCount">
          <strong>
            <FormattedMessage
              id="discover.viewModes.fieldStatistics.countLabel"
              defaultMessage="{count} {count, plural, one {field} other {fields}}"
              values={{ count: fieldsCount }}
            />
          </strong>
        </EuiText>
      );
    }

    return <HitsCounter variant={hitsCounterVariant ?? (isEsqlMode ? 'results' : 'documents')} />;
  }, [viewMode, patternCount, fieldsCount, isEsqlMode, hitsCounterVariant]);

  // if neither the pattern analysis nor field statistics view is available, there's only
  // one possible view (Documents/Results), so there's nothing to select between
  const showOnlyDocumentsCounter =
    showFieldStatisticsTab === false && showPatternAnalysisTab === false;

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
      {!showOnlyDocumentsCounter && (
        <EuiFlexItem grow={false}>
          <ToolbarSelector
            data-test-subj="dscViewModeToggle"
            data-selected-value={viewMode}
            searchable={false}
            buttonLabel={buttonLabel}
            popoverTitle={i18n.translate('discover.viewModes.popoverTitle', {
              defaultMessage: 'Select view',
            })}
            options={options}
            onChange={onChange}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>{countDisplay}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
