/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React, { useMemo, useEffect, useState, type ReactElement, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSuperSelect,
  useEuiTheme,
  type EuiSuperSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import useMountedState from 'react-use/lib/useMountedState';
import { VIEW_MODE } from '../../../common/constants';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { HitsCounter, HitsCounterMode } from '../hits_counter';

export const DocumentViewModeToggle = ({
  viewMode,
  isEsqlMode,
  prepend,
  setDiscoverViewMode,
  patternCount,
  dataView,
  hitCounterLabel,
  hitCounterPluralLabel,
  hitsTotalToDisplay,
}: {
  viewMode: VIEW_MODE;
  isEsqlMode: boolean;
  prepend?: ReactElement;
  setDiscoverViewMode: (viewMode: VIEW_MODE, replace?: boolean) => Promise<VIEW_MODE>;
  patternCount?: number;
  dataView: DataView;
} & Pick<
  ComponentProps<typeof HitsCounter>,
  'hitCounterLabel' | 'hitCounterPluralLabel' | 'hitsTotalToDisplay'
>) => {
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

  const includesNormalTabsStyle = viewMode === VIEW_MODE.AGGREGATED_LEVEL;

  const containerPadding = includesNormalTabsStyle ? euiTheme.size.s : 0;
  const containerCss = css`
    padding: ${containerPadding} ${containerPadding} 0 ${containerPadding};
  `;

  const tabsCss = css`
    min-width: ${euiTheme.base * 10}px;
  `;

  const viewModeOptions = useMemo<Array<EuiSuperSelectOption<VIEW_MODE>>>(() => {
    const options: Array<EuiSuperSelectOption<VIEW_MODE>> = [
      {
        value: VIEW_MODE.DOCUMENT_LEVEL,
        inputDisplay: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="table" aria-hidden="true" />
            </EuiFlexItem>
            <EuiFlexItem>
              {isEsqlMode
                ? i18n.translate('discover.viewModes.esql.label', {
                    defaultMessage: 'Results',
                  })
                : i18n.translate('discover.viewModes.document.label', {
                    defaultMessage: 'Documents',
                  })}
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        'data-test-subj': 'dscViewModeDocumentOption',
      },
    ];

    if (showPatternAnalysisTab) {
      options.push({
        value: VIEW_MODE.PATTERN_LEVEL,
        inputDisplay: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="pattern" aria-hidden="true" />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate('discover.viewModes.patternAnalysis.dropdownLabel', {
                defaultMessage: 'Patterns{patternCount}',
                values: {
                  patternCount: patternCount !== undefined ? ` (${patternCount})` : '',
                },
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        'data-test-subj': 'dscViewModePatternAnalysisOption',
      });
    }

    if (showFieldStatisticsTab) {
      options.push({
        value: VIEW_MODE.AGGREGATED_LEVEL,
        inputDisplay: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="stats" aria-hidden="true" />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate('discover.viewModes.fieldStatistics.label', {
                defaultMessage: 'Field statistics',
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        disabled: isEsqlMode,
        'data-test-subj': 'dscViewModeFieldStatsOption',
      });
    }

    return options;
  }, [isEsqlMode, patternCount, showFieldStatisticsTab, showPatternAnalysisTab]);

  useEffect(() => {
    if (viewMode === VIEW_MODE.AGGREGATED_LEVEL && isEsqlMode) {
      setDiscoverViewMode(VIEW_MODE.DOCUMENT_LEVEL, true);
    }
  }, [viewMode, isEsqlMode, setDiscoverViewMode]);

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
      <EuiFlexItem grow={false}>
        {showFieldStatisticsTab === false && showPatternAnalysisTab === false ? (
          <HitsCounter
            mode={HitsCounterMode.standalone}
            hitCounterLabel={hitCounterLabel}
            hitCounterPluralLabel={hitCounterPluralLabel}
            hitsTotalToDisplay={hitsTotalToDisplay}
          />
        ) : (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSuperSelect<VIEW_MODE>
                options={viewModeOptions}
                valueOfSelected={viewMode}
                onChange={setDiscoverViewMode}
                prepend={i18n.translate('discover.viewModes.visibleLabel', {
                  defaultMessage: 'View',
                })}
                compressed
                hasDividers
                data-test-subj="dscViewModeToggle"
                aria-label={i18n.translate('discover.viewModes.ariaLabel', {
                  defaultMessage: 'Select a Discover view',
                })}
                css={tabsCss}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <HitsCounter
                mode={HitsCounterMode.standalone}
                hitCounterLabel={hitCounterLabel}
                hitCounterPluralLabel={hitCounterPluralLabel}
                hitsTotalToDisplay={hitsTotalToDisplay}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
