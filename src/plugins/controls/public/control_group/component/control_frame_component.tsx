/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import classNames from 'classnames';
import {
  EuiButtonIcon,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingChart,
  EuiPopover,
  EuiPortal,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import { Markdown } from '@kbn/kibana-react-plugin/public';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { ControlGroupReduxState } from '../types';
import { pluginServices } from '../../services';
import { EditControlButton } from '../editor/edit_control';
import { ControlGroupStrings } from '../control_group_strings';
import { useChildEmbeddable } from '../../hooks/use_child_embeddable';
import { TIME_SLIDER_CONTROL } from '../../../common';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlGroupContainer } from '..';

interface ControlFrameErrorProps {
  error: Error;
}

const ControlFrameError = ({ error }: ControlFrameErrorProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const popoverButton = (
    <EuiText className="errorEmbeddableCompact__button" size="xs">
      <EuiLink
        className="eui-textTruncate"
        color="subdued"
        onClick={() => setPopoverOpen((open) => !open)}
      >
        <EuiIcon type="alert" color="danger" />
        <FormattedMessage
          id="controls.frame.error.message"
          defaultMessage="An error has occurred. Read more"
        />
      </EuiLink>
    </EuiText>
  );

  return (
    <EuiPopover
      button={popoverButton}
      isOpen={isPopoverOpen}
      anchorClassName="errorEmbeddableCompact__popoverAnchor"
      closePopover={() => setPopoverOpen(false)}
    >
      <Markdown
        markdown={error.message}
        openLinksInNewTab={true}
        data-test-subj="errorMessageMarkdown"
      />
    </EuiPopover>
  );
};

export interface ControlFrameProps {
  customPrepend?: JSX.Element;
  enableActions?: boolean;
  embeddableId: string;
  embeddableType: string;
}

export const ControlFrame = ({
  customPrepend,
  enableActions,
  embeddableId,
  embeddableType,
}: ControlFrameProps) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);
  const { euiTheme } = useEuiTheme();
  const [fatalError, setFatalError] = useState<Error>();
  const [areFloatingActionsVisible, setFloatingActionsVisible] = useState<boolean>(false);
  const showFloatingActions = () => setFloatingActionsVisible(true);
  const hideFloatingActions = () => setFloatingActionsVisible(false);

  const { useEmbeddableSelector: select, embeddableInstance: controlGroup } =
    useReduxEmbeddableContext<
      ControlGroupReduxState,
      typeof controlGroupReducers,
      ControlGroupContainer
    >();

  const controlStyle = select((state) => state.explicitInput.controlStyle);

  // Controls Services Context
  const {
    overlays: { openConfirm },
  } = pluginServices.getServices();

  const embeddable = useChildEmbeddable({
    untilEmbeddableLoaded: controlGroup.untilEmbeddableLoaded.bind(controlGroup),
    embeddableType,
    embeddableId,
  });

  const [title, setTitle] = useState<string>();

  const usingTwoLineLayout = controlStyle === 'twoLine';

  useEffect(() => {
    if (embeddableRoot.current) {
      embeddable?.render(embeddableRoot.current);
    }
    const inputSubscription = embeddable
      ?.getInput$()
      .subscribe((newInput) => setTitle(newInput.title));
    const errorSubscription = embeddable?.getOutput$().subscribe({
      error: setFatalError,
    });
    return () => {
      inputSubscription?.unsubscribe();
      errorSubscription?.unsubscribe();
    };
  }, [embeddable, embeddableRoot]);

  const anchorRef = useRef<HTMLSpanElement>(null);

  const anchorBoundingRect = anchorRef.current?.getBoundingClientRect();
  const floatingActionStyles = anchorBoundingRect
    ? css`
        top: ${anchorBoundingRect.top -
        (usingTwoLineLayout ? parseInt(euiTheme.size.xs, 10) : parseInt(euiTheme.size.l, 10))}px;
        left: ${anchorBoundingRect.right - parseInt(euiTheme.size.xxxxl, 10)}px;
        ${areFloatingActionsVisible
          ? `transition: visibility .1s, opacity .1s;
          visibility: visible;
          opacity: 1;`
          : `visibility: hidden;
          opacity: 0;
  
          // slower transition on hover leave in case the user accidentally stops hover
          transition: visibility .3s, opacity .3s;`}
      `
    : css``;

  const floatingActions = (
    <div
      className={classNames('controlFrameFloatingActions', {
        'controlFrameFloatingActions--twoLine': usingTwoLineLayout,
        'controlFrameFloatingActions--oneLine': !usingTwoLineLayout,
      })}
      css={floatingActionStyles}
      onMouseOver={showFloatingActions}
      onFocus={showFloatingActions}
    >
      {!fatalError && embeddableType !== TIME_SLIDER_CONTROL && (
        <EuiToolTip content={ControlGroupStrings.floatingActions.getEditButtonTitle()}>
          <EditControlButton embeddableId={embeddableId} />
        </EuiToolTip>
      )}
      <EuiToolTip content={ControlGroupStrings.floatingActions.getRemoveButtonTitle()}>
        <EuiButtonIcon
          data-test-subj={`control-action-${embeddableId}-delete`}
          aria-label={ControlGroupStrings.floatingActions.getRemoveButtonTitle()}
          onClick={() =>
            openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
              confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
              cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
              title: ControlGroupStrings.management.deleteControls.getDeleteTitle(),
              buttonColor: 'danger',
            }).then((confirmed) => {
              if (confirmed) {
                controlGroup.removeEmbeddable(embeddableId);
              }
            })
          }
          iconType="cross"
          color="danger"
          tabIndex={0}
        />
      </EuiToolTip>
    </div>
  );

  const embeddableParentClassNames = classNames('controlFrame__control', {
    'controlFrame--twoLine': controlStyle === 'twoLine',
    'controlFrame--oneLine': controlStyle === 'oneLine',
    'controlFrame--fatalError': !!fatalError,
  });

  function renderEmbeddablePrepend() {
    if (typeof embeddable?.renderPrepend === 'function') {
      return embeddable.renderPrepend();
    }

    return usingTwoLineLayout ? undefined : (
      <EuiToolTip anchorClassName="controlFrame__labelToolTip" content={title}>
        <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
          {title}
        </EuiFormLabel>
      </EuiToolTip>
    );
  }

  const form = (
    <EuiFormControlLayout
      className={classNames('controlFrame__formControlLayout', {
        'controlFrameFormControlLayout--twoLine': controlStyle === 'twoLine',
      })}
      fullWidth
      prepend={
        <>
          {(embeddable && customPrepend) ?? null}
          {renderEmbeddablePrepend()}
        </>
      }
    >
      {embeddable && !fatalError && (
        <div
          className={embeddableParentClassNames}
          id={`controlFrame--${embeddableId}`}
          ref={embeddableRoot}
        >
          {fatalError && <ControlFrameError error={fatalError} />}
        </div>
      )}
      {fatalError && (
        <div className={embeddableParentClassNames} id={`controlFrame--${embeddableId}`}>
          {<ControlFrameError error={fatalError} />}
        </div>
      )}
      {!embeddable && (
        <div className={embeddableParentClassNames} id={`controlFrame--${embeddableId}`}>
          <div className="controlFrame--controlLoading">
            <EuiLoadingChart />
          </div>
        </div>
      )}
    </EuiFormControlLayout>
  );

  return (
    <>
      {embeddable && enableActions && <EuiPortal>{floatingActions}</EuiPortal>}
      <span ref={anchorRef} onMouseOver={showFloatingActions} onFocus={showFloatingActions}>
        <EuiFormRow
          data-test-subj="control-frame-title"
          fullWidth
          label={
            usingTwoLineLayout
              ? title || ControlGroupStrings.emptyState.getTwoLineLoadingTitle()
              : undefined
          }
          onMouseOver={showFloatingActions}
          onFocus={showFloatingActions}
          onMouseLeave={hideFloatingActions}
          onBlur={hideFloatingActions}
        >
          {form}
        </EuiFormRow>
      </span>
    </>
  );
};
