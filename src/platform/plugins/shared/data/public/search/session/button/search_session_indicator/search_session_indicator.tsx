/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmptyProps, EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SearchSessionState } from './connected_background_search_button';

export interface SearchSessionIndicatorProps {
  state: SearchSessionState;
  onContinueInBackground?: () => void;
  onCancel?: () => void;
  viewSearchSessionsLink?: string;
  onViewSearchSessions?: () => void;
  onSaveResults?: () => void;
  onOpenMangementFlyout?: () => void;
  managementDisabled?: boolean;
  managementDisabledReasonText?: string;
  saveDisabled?: boolean;
  saveDisabledReasonText?: string;

  onOpened?: (openedState: SearchSessionState) => void;

  searchSessionName?: string;
  saveSearchSessionNameFn?: (newName: string) => Promise<unknown>;

  startedTime?: Date;
  completedTime?: Date;
  canceledTime?: Date;
}

type ActionButtonProps = SearchSessionIndicatorProps & { buttonProps: EuiButtonEmptyProps };

const searchSessionIndicatorViewStateToProps: {
  [state in SearchSessionState]: {
    button: Pick<EuiButtonIconProps, 'color' | 'iconType' | 'aria-label'> & {
      tooltipText: string;
    };
    popover: {
      title: string;
      description: string;
      whenText: (props: SearchSessionIndicatorProps) => string;
      primaryAction?: React.ComponentType<ActionButtonProps>;
      secondaryAction?: React.ComponentType<ActionButtonProps>;
    };
  } | null;
} = {
  [SearchSessionState.Loading]: {
    button: {
      color: 'text',
      iconType: 'clockCounter',
      'aria-label': i18n.translate('data.searchSessionIndicator.loadingResultsIconAriaLabel', {
        defaultMessage: 'Search session loading',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.loadingResultsIconTooltipText', {
        defaultMessage: 'Search session loading',
      }),
    },
  },
  [SearchSessionState.Completed]: {
    button: {
      color: 'neutral',
      isDisabled: true,
      iconType: 'clockCounter',
      'aria-label': i18n.translate('data.searchSessionIndicator.resultsLoadedIconAriaLabel', {
        defaultMessage: 'Background search inactive',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.resultsLoadedIconTooltipText', {
        defaultMessage: 'Background search inactive',
      }),
    },
  },
};

export interface SearchSessionIndicatorRef {
  openPopover: () => void;
  closePopover: () => void;
}

export const SearchSessionIndicator = React.forwardRef<
  SearchSessionIndicatorRef,
  SearchSessionIndicatorProps
>((props) => {
  const { button } = searchSessionIndicatorViewStateToProps[props.state]
    ? searchSessionIndicatorViewStateToProps[props.state]
    : searchSessionIndicatorViewStateToProps[SearchSessionState.Completed];
  const onButtonClick =
    props.state === SearchSessionState.Loading ? props.onSaveResults : undefined;

  return (
    <EuiButtonIcon
      color={button.color}
      aria-label={button['aria-label']}
      iconType={button.iconType}
      onClick={onButtonClick}
      isDisabled={button.isDisabled}
    />
  );
});
// React.lazy() needs default:
// eslint-disable-next-line import/no-default-export
export default SearchSessionIndicator;
