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

const CancelButton = ({ onCancel = () => {}, buttonProps = {} }: ActionButtonProps) => (
  <EuiButtonEmpty
    onClick={onCancel}
    data-test-subj={'searchSessionIndicatorCancelBtn'}
    color="danger"
    {...buttonProps}
  >
    <FormattedMessage
      id="data.searchSessionIndicator.cancelButtonText"
      defaultMessage="Stop session"
    />
  </EuiButtonEmpty>
);

const ContinueInBackgroundButton = ({
  onContinueInBackground = () => {},
  buttonProps = {},
  saveDisabled = false,
  saveDisabledReasonText,
}: ActionButtonProps) => (
  <EuiToolTip content={saveDisabledReasonText}>
    <EuiButtonEmpty
      onClick={onContinueInBackground}
      data-test-subj={'searchSessionIndicatorSaveBtn'}
      isDisabled={saveDisabled}
      {...buttonProps}
    >
      <FormattedMessage
        id="data.searchSessionIndicator.continueInBackgroundButtonText"
        defaultMessage="Save session"
      />
    </EuiButtonEmpty>
  </EuiToolTip>
);

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

const SaveButton = ({
  onSaveResults = () => {},
  buttonProps = {},
  saveDisabled = false,
  saveDisabledReasonText,
}: ActionButtonProps) => (
  <EuiToolTip content={saveDisabledReasonText}>
    <EuiButtonEmpty
      onClick={onSaveResults}
      data-test-subj={'searchSessionIndicatorSaveBtn'}
      isDisabled={saveDisabled}
      {...buttonProps}
    >
      <FormattedMessage
        id="data.searchSessionIndicator.saveButtonText"
        defaultMessage="Save session"
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
    popover: {
      title: i18n.translate('data.searchSessionIndicator.loadingResultsTitle', {
        defaultMessage: 'Your search is taking a while...',
      }),
      description: i18n.translate('data.searchSessionIndicator.loadingResultsDescription', {
        defaultMessage: 'Save your session, continue your work, and return to completed results',
      }),
      whenText: (props: SearchSessionIndicatorProps) =>
        i18n.translate('data.searchSessionIndicator.loadingResultsWhenText', {
          defaultMessage: 'Started {when}',
          values: {
            when: props.startedTime ? moment(props.startedTime).format(`L @ LTS`) : '',
          },
        }),
      primaryAction: CancelButton,
      secondaryAction: ContinueInBackgroundButton,
    },
  },
  [SearchSessionState.Completed]: {
    button: {
      color: 'text',
      iconType: 'check',
      'aria-label': i18n.translate('data.searchSessionIndicator.resultsLoadedIconAriaLabel', {
        defaultMessage: 'Yolo 😱 background search complete',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.resultsLoadedIconTooltipText', {
        defaultMessage: 'Yolo 😱 background search complete',
      }),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.resultsLoadedText', {
        defaultMessage: 'Yolo 😱 background search complete',
      }),
      description: i18n.translate('data.searchSessionIndicator.resultsLoadedDescriptionText', {
        defaultMessage: 'Save your Yolo 😱 background search and return to it later',
      }),
      whenText: (props: SearchSessionIndicatorProps) =>
        i18n.translate('data.searchSessionIndicator.resultsLoadedWhenText', {
          defaultMessage: 'Completed {when}',
          values: {
            when: props.completedTime ? moment(props.completedTime).format(`L @ LTS`) : '',
          },
        }),
      primaryAction: SaveButton,
      secondaryAction: ViewAllSearchSessionsButton,
    },
  },
  [SearchSessionState.BackgroundLoading]: {
    button: {
      iconType: EuiLoadingSpinner,
      'aria-label': i18n.translate(
        'data.searchSessionIndicator.loadingInTheBackgroundIconAriaLabel',
        {
          defaultMessage: 'Yolo 😱 background search in progress',
        }
      ),
      tooltipText: i18n.translate(
        'data.searchSessionIndicator.loadingInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Yolo 😱 background search in progress',
        }
      ),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.loadingInTheBackgroundTitleText', {
        defaultMessage: 'Yolo 😱 background search in progress',
      }),
      description: i18n.translate(
        'data.searchSessionIndicator.loadingInTheBackgroundDescriptionText',
        {
          defaultMessage: 'You can return to completed results from Management',
        }
      ),
      whenText: (props: SearchSessionIndicatorProps) =>
        i18n.translate('data.searchSessionIndicator.loadingInTheBackgroundWhenText', {
          defaultMessage: 'Started {when}',
          values: {
            when: props.startedTime ? moment(props.startedTime).format(`L @ LTS`) : '',
          },
        }),
      primaryAction: CancelButton,
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
          defaultMessage: 'Yolo 😱 background search complete',
        }
      ),
      tooltipText: i18n.translate(
        'data.searchSessionIndicator.resultLoadedInTheBackgroundIconTooltipText',
        {
          defaultMessage: 'Yolo 😱 background search complete',
        }
      ),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.resultLoadedInTheBackgroundTitleText', {
        defaultMessage: 'Yolo 😱 background search saved',
      }),
      description: i18n.translate(
        'data.searchSessionIndicator.resultLoadedInTheBackgroundDescriptionText',
        {
          defaultMessage: 'You can return to these results from Management',
        }
      ),
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
      iconType: 'checkCircle',
      'aria-label': i18n.translate('data.searchSessionIndicator.restoredResultsIconAriaLabel', {
        defaultMessage: 'Yolo 😱 background search restored',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.restoredResultsTooltipText', {
        defaultMessage: 'Yolo 😱 background search restored',
      }),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.restoredTitleText', {
        defaultMessage: 'Yolo 😱 background search restored',
      }),
      description: i18n.translate('data.searchSessionIndicator.restoredDescriptionText', {
        defaultMessage:
          'You are viewing cached data from a specific time range. Changing the time range or filters will re-run the session',
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
        defaultMessage: 'Yolo 😱 background search stopped',
      }),
      tooltipText: i18n.translate('data.searchSessionIndicator.canceledTooltipText', {
        defaultMessage: 'Yolo 😱 background search stopped',
      }),
    },
    popover: {
      title: i18n.translate('data.searchSessionIndicator.canceledTitleText', {
        defaultMessage: 'Yolo 😱 background search stopped',
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

  if (!searchSessionIndicatorViewStateToProps[props.state]) return null;

  const { button, popover } = searchSessionIndicatorViewStateToProps[props.state]!;

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
        <EuiSpacer size="m" />
        <EuiText size={'s'}>
          <p>Yolo 😱 Background search</p>
        </EuiText>

        <EuiText size={'s'}>
          <p>{props.searchSessionName || popover.title}</p>
        </EuiText>

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
          {popover.primaryAction && (
            <EuiFlexItem grow={false}>
              <popover.primaryAction {...props} buttonProps={{ size: 'xs' }} />
            </EuiFlexItem>
          )}
          {popover.secondaryAction && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={props.onOpenMangementFlyout}>Manage</EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
});
// React.lazy() needs default:
// eslint-disable-next-line import/no-default-export
export default SearchSessionIndicator;
