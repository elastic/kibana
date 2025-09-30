/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useToolbarActions } from '../hooks/use_toolbar_actions';

interface RightSideActionsProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions'> {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  'data-test-subj'?: string;
  fields: MetricField[];
  indexPattern: string;
}

export const RightSideActions = ({
  searchTerm,
  onSearchTermChange,
  'data-test-subj': dataTestSubj,
  fields,
  indexPattern,
  renderToggleActions,
  requestParams,
}: RightSideActionsProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    onShowSearch,
    showSearchInput,
    isFullscreen,
    onToggleFullscreen,
    onClearSearch,
    onKeyDown,
  } = useToolbarActions({
    fields,
    indexPattern,
    renderToggleActions,
    requestParams,
  });

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchTermChange(e.target.value);
    },
    [onSearchTermChange]
  );

  const onBlur = useCallback(() => {
    if (searchTerm === '') {
      onClearSearch();
    }
  }, [onClearSearch, searchTerm]);

  const searchButtonLabel = i18n.translate('metricsExperience.searchButton', {
    defaultMessage: 'Search',
  });

  const fullscreenButtonLabel = isFullscreen
    ? i18n.translate('metricsExperience.fullScreenExitButton', {
        defaultMessage: 'Exit fullscreen (esc)',
      })
    : i18n.translate('metricsExperience.fullScreenButton', {
        defaultMessage: 'Enter fullscreen',
      });

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none" alignItems="center">
          {showSearchInput ? (
            <EuiFlexItem grow={false}>
              <EuiFieldSearch
                autoFocus
                value={searchTerm}
                onChange={onSearchChange}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                placeholder={i18n.translate('metricsExperience.searchInputPlaceholder', {
                  defaultMessage: 'Search metrics',
                })}
                fullWidth={false}
                compressed
                aria-label={i18n.translate('metricsExperience.searchInputAriaLabel', {
                  defaultMessage: 'Search metrics',
                })}
                data-test-subj={dataTestSubj}
                css={css`
                  border-top-right-radius: 0;
                  border-bottom-right-radius: 0;
                  min-width: 200px;
                `}
              />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="search"
                aria-label={searchButtonLabel}
                title={searchButtonLabel}
                onClick={onShowSearch}
                data-test-subj="metricsExperienceToolbarSearch"
                size="s"
                css={css`
                  border: ${euiTheme.border.thin};
                  border-right: none;
                  border-top-right-radius: 0;
                  border-bottom-right-radius: 0;
                `}
                color="text"
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isFullscreen ? 'fullScreenExit' : 'fullScreen'}
              aria-label={fullscreenButtonLabel}
              title={fullscreenButtonLabel}
              onClick={onToggleFullscreen}
              data-test-subj="metricsExperienceToolbarFullScreen"
              size="s"
              css={css`
                border: ${euiTheme.border.thin};
                border-left: ${showSearchInput ? 'none' : euiTheme.border.thin};
                border-top-left-radius: 0;
                border-bottom-left-radius: 0;
              `}
              color="text"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
