/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, keys } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { useToolbarActions } from '../hooks/use_toolbar_actions';

interface RightSideActionsProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  'data-test-subj'?: string;
  fields: MetricField[];
  indexPattern: string;
  renderToggleActions: () => React.ReactElement | undefined;
  requestParams: any;
  setDebouncedSearchTerm: (value: string) => void;
}

export const RightSideActions = ({
  searchTerm,
  onSearchTermChange,
  'data-test-subj': dataTestSubj,
  fields,
  indexPattern,
  renderToggleActions,
  requestParams,
  setDebouncedSearchTerm,
}: RightSideActionsProps) => {
  const { onShowSearch, showSearchInput, isFullscreen, onToggleFullscreen, onClearSearch } =
    useToolbarActions({
      fields,
      indexPattern,
      renderToggleActions,
      requestParams,
      setDebouncedSearchTerm,
    });

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchTermChange(e.target.value);
    },
    [onSearchTermChange]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === keys.ESCAPE) {
        onClearSearch();
      }
    },
    [onClearSearch]
  );

  const onBlur = useCallback(() => {
    if (searchTerm === '') {
      onClearSearch();
    }
  }, [onClearSearch, searchTerm]);

  const buttons: IconButtonGroupProps['buttons'] = [
    ...(!showSearchInput
      ? [
          {
            iconType: 'search',
            label: i18n.translate('metricsExperience.searchButton', {
              defaultMessage: 'Search',
            }),
            onClick: onShowSearch,
            'data-test-subj': 'metricsExperienceToolbarSearch',
          },
        ]
      : []),
    {
      iconType: isFullscreen ? 'fullScreenExit' : 'fullScreen',
      label: isFullscreen
        ? i18n.translate('metricsExperience.fullScreenExitButton', {
            defaultMessage: 'Exit fullscreen',
          })
        : i18n.translate('metricsExperience.fullScreenButton', {
            defaultMessage: 'Enter fullscreen',
          }),
      onClick: onToggleFullscreen,
      'data-test-subj': 'metricsExperienceToolbarFullScreen',
      css: showSearchInput
        ? css`
            &.euiButtonGroupButton {
              border-left: none !important;

              &:first-of-type {
                border-top-left-radius: 0px !important;
                border-bottom-left-radius: 0px !important;
              }

              &:last-of-type {
                border-left: none !important;
                border-top-left-radius: 0px !important;
                border-bottom-left-radius: 0px !important;
              }

              &:not(:first-child):not(.euiButtonGroupButton-isSelected):not(:disabled) {
                box-shadow: unset;
              }
            }
          `
        : undefined,
    },
  ];

  return (
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
      ) : null}
      <EuiFlexItem grow={false}>
        <IconButtonGroup
          legend={i18n.translate('metricsExperience.chartActions', {
            defaultMessage: 'Chart actions',
          })}
          buttons={buttons}
          buttonSize="s"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
