/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useImperativeHandle } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonEmptyProps,
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CheckInEmptyCircle, PartialClock } from './custom_icons';
import { SearchSessionState } from '../../search_session_state';

export interface SearchSessionIndicatorProps {
  state: SearchSessionState;
  onContinueInBackground?: () => void;
  onCancel?: () => void;
  viewSearchSessionsLink?: string;
  onViewSearchSessions?: () => void;
  onSaveResults?: () => void;
  managementDisabled?: boolean;
  managementDisabledReasonText?: string;
  saveDisabled?: boolean;
  saveDisabledReasonText?: string;
  onOpenMangementFlyout?: () => void;
  onOpened?: (openedState: SearchSessionState) => void;
  searchSessionName?: string;
  saveSearchSessionNameFn?: (newName: string) => Promise<unknown>;
  startedTime?: Date;
  completedTime?: Date;
  canceledTime?: Date;
}

type ActionButtonProps = SearchSessionIndicatorProps & { buttonProps: EuiButtonEmptyProps };

const ViewAllSearchSessionsButton = ({
  viewSearchSessionsLink = 'management/kibana/search_sessions',
  onViewSearchSessions = () => {},
  buttonProps = {},
  managementDisabled,
  managementDisabledReasonText,
}: ActionButtonProps) => (
  <EuiToolTip content={managementDisabledReasonText}>
    {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
    <EuiButtonEmpty
      href={viewSearchSessionsLink}
      onClick={onViewSearchSessions}
      data-test-subj={'searchSessionIndicatorViewSearchSessionsLink'}
      isDisabled={managementDisabled}
      {...buttonProps}
    >
      <FormattedMessage
        id="data.searchSessionIndicator.viewSearchSessionsLinkText"
        defaultMessage="Manage sessions"
      />
    </EuiButtonEmpty>
  </EuiToolTip>
);

const searchSessionIndicatorViewStateToProps: {
  [state in SearchSessionState]: {
    button: Pick<EuiButtonIconProps, 'color' | 'iconType' | 'aria-label'> & {
      tooltipText: string;
    };
    popover: {
      title: string;
      primaryAction?: React.ComponentType<ActionButtonProps>;
      secondaryAction?: React.ComponentType<ActionButtonProps>;
    };
  } | null;
} = {
  [SearchSessionState.None]: null,
  [SearchSessionState.Loading]: {
    button: {
      color: 'text',
      iconType: PartialClock,
      'aria-label': i18n.translate('data.searchSessionIndicator.loadingResultsIconAriaLabel', {
        defaultMessage: 'Search session loading',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.loadingResultsIconTooltipText', {
        defaultMessage: 'Search session loading',
      }),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.loadingResultsTitle', {
        defaultMessage: 'Your search is taking a while...',
      }),
    },
  },
  [SearchSessionState.Completed]: {
    button: {
      color: 'text',
      iconType: PartialClock,
      'aria-label': i18n.translate('data.searchSessionIndicator.resultsLoadedIconAriaLabel', {
        defaultMessage: 'Background search',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.resultsLoadedIconTooltipText', {
        defaultMessage: 'Background search',
      }),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.resultsLoadedText', {
        defaultMessage: 'Background search',
      }),
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.BackgroundLoading]: {
    button: {
      iconType: EuiLoadingSpinner,
      'aria-label': i18n.translate(
        'data.searchSessionIndicator.loadingInTheBackgroundIconAriaLabel',
        {
          defaultMessage: 'Saved session in progress',
        }
      ),
      tooltipText: i18n.translate(
        'data.searchSessionIndicator.loadingInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Saved session in progress',
        }
      ),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.loadingInTheBackgroundTitleText', {
        defaultMessage: 'Saved session in progress',
      }),
      whenText: (props: SearchSessionIndicatorProps) =>
        i18n.translate('data.searchSessionIndicator.loadingInTheBackgroundWhenText', {
          defaultMessage: 'Started {when}',
          values: {
            when: props.startedTime ? moment(props.startedTime).format(`L @ LTS`) : '',
          },
        }),
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.BackgroundCompleted]: {
    button: {
      color: 'success',
      iconType: 'checkInCircleFilled',
      'aria-label': i18n.translate(
        'data.searchSessionIndicator.resultLoadedInTheBackgroundIconAriaLabel',
        {
          defaultMessage: 'Saved session complete',
        }
      ),
      tooltipText: i18n.translate(
        'data.searchSessionIndicator.resultLoadedInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Saved session complete',
        }
      ),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.resultLoadedInTheBackgroundTitleText', {
        defaultMessage: 'Search session saved',
      }),
      whenText: (props: SearchSessionIndicatorProps) =>
        i18n.translate('data.searchSessionIndicator.resultLoadedInTheBackgroundWhenText', {
          defaultMessage: 'Completed {when}',
          values: {
            when: props.completedTime ? moment(props.completedTime).format(`L @ LTS`) : '',
          },
        }),
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.Restored]: {
    button: {
      color: 'success',
      iconType: CheckInEmptyCircle,
      'aria-label': i18n.translate('data.searchSessionIndicator.restoredResultsIconAriaLabel', {
        defaultMessage: 'Saved session restored',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.restoredResultsTooltipText', {
        defaultMessage: 'Search session restored',
      }),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.restoredTitleText', {
        defaultMessage: 'Search session restored',
      }),
      whenText: (props: SearchSessionIndicatorProps) =>
        i18n.translate('data.searchSessionIndicator.restoredWhenText', {
          defaultMessage: 'Completed {when}',
          values: {
            when: props.completedTime ? moment(props.completedTime).format(`L @ LTS`) : '',
          },
        }),
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.Canceled]: {
    button: {
      color: 'danger',
      iconType: 'error',
      'aria-label': i18n.translate('data.searchSessionIndicator.canceledIconAriaLabel', {
        defaultMessage: 'Search session stopped',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.canceledTooltipText', {
        defaultMessage: 'Search session stopped',
      }),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.canceledTitleText', {
        defaultMessage: 'Search session stopped',
      }),
      description: i18n.translate('data.searchSessionIndicator.canceledDescriptionText', {
        defaultMessage: 'You are viewing incomplete data',
      }),
      whenText: (props: SearchSessionIndicatorProps) =>
        i18n.translate('data.searchSessionIndicator.canceledWhenText', {
          defaultMessage: 'Stopped {when}',
          values: {
            when: props.canceledTime ? moment(props.canceledTime).format(`L @ LTS`) : '',
          },
        }),
      secondaryAction: ViewAllSearchSessionsButton,
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
>((props, ref) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onOpened = props.onOpened;
  const openPopover = useCallback(() => {
    setIsPopoverOpen(true);
    if (onOpened) onOpened(props.state);
  }, [onOpened, props.state]);
  const onButtonClick = useCallback(() => {
    if (isPopoverOpen) {
      closePopover();
    } else {
      openPopover();
    }
  }, [isPopoverOpen, openPopover, closePopover]);

  useImperativeHandle(
    ref,
    () => ({
      openPopover: () => {
        openPopover();
      },
      closePopover: () => {
        closePopover();
      },
    }),
    [openPopover, closePopover]
  );

  const { button, popover } = searchSessionIndicatorViewStateToProps[props.state]
    ? searchSessionIndicatorViewStateToProps[props.state]!
    : searchSessionIndicatorViewStateToProps[SearchSessionState.Completed];

  return (
    <EuiPopover
      ownFocus
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition={'downLeft'}
      panelPaddingSize={'m'}
      className="searchSessionIndicator"
      data-test-subj={'searchSessionIndicator'}
      data-state={props.state}
      data-save-disabled={props.saveDisabled ?? false}
      panelClassName={'searchSessionIndicator__panel'}
      repositionOnScroll={true}
      button={
        <EuiToolTip content={button.tooltipText} delay={'long'}>
          <EuiButtonIcon
            color={button.color}
            aria-label={button['aria-label']}
            iconType={button.iconType}
            onClick={onButtonClick}
          />
        </EuiToolTip>
      }
    >
      <div data-test-subj="searchSessionIndicatorPopoverContainer">
        {props.searchSessionName ? (
          <EuiText size={'s'}>name={props.searchSessionName}</EuiText>
        ) : (
          <EuiText size={'s'}>
            <p>{popover.title}</p>
          </EuiText>
        )}

        <EuiSpacer size={'xs'} />
        {popover.whenText?.(props) ? (
          <>
            <EuiText size="xs" color={'subdued'}>
              <p>{popover.whenText(props)}</p>
            </EuiText>
            <EuiSpacer size={'xs'} />
          </>
        ) : null}

        <EuiText size="xs" color={'subdued'}>
          <p>{popover.description}</p>
        </EuiText>
        <EuiSpacer size={'m'} />
        <EuiFlexGroup
          wrap={true}
          responsive={false}
          alignItems={'center'}
          justifyContent={'flexEnd'}
          gutterSize={'s'}
        >
          <EuiFlexItem>
            <EuiButtonEmpty
              onClick={() => {
                setIsPopoverOpen(false);
                props.onOpenMangementFlyout();
              }}
            >
              Open Management
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
});

// React.lazy() needs default:
// eslint-disable-next-line import/no-default-export
export default SearchSessionIndicator;
