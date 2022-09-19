/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import {
  EuiButtonIcon,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiLoadingChart,
  EuiToolTip,
} from '@elastic/eui';

import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { ControlGroupReduxState } from '../types';
import { pluginServices } from '../../services';
import { EditControlButton } from '../editor/edit_control';
import { ControlGroupStrings } from '../control_group_strings';
import { useChildEmbeddable } from '../../hooks/use_child_embeddable';
import { TIME_SLIDER_CONTROL } from '../../../common';

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
  const [hasFatalError, setHasFatalError] = useState(false);

  const {
    useEmbeddableSelector: select,
    containerActions: { untilEmbeddableLoaded, removeEmbeddable },
  } = useReduxContainerContext<ControlGroupReduxState>();

  const controlStyle = select((state) => state.explicitInput.controlStyle);

  // Controls Services Context
  const {
    overlays: { openConfirm },
  } = pluginServices.getServices();

  const embeddable = useChildEmbeddable({ untilEmbeddableLoaded, embeddableId, embeddableType });

  const [title, setTitle] = useState<string>();

  const usingTwoLineLayout = controlStyle === 'twoLine';

  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
    const inputSubscription = embeddable
      ?.getInput$()
      .subscribe((newInput) => setTitle(newInput.title));
    const errorSubscription = embeddable?.getOutput$().subscribe({
      error: (error: Error) => {
        if (!embeddableRoot.current) return;
        const errorEmbeddable = new ErrorEmbeddable(error, { id: embeddable.id }, undefined, true);
        errorEmbeddable.render(embeddableRoot.current);
        setHasFatalError(true);
      },
    });
    return () => {
      inputSubscription?.unsubscribe();
      errorSubscription?.unsubscribe();
    };
  }, [embeddable, embeddableRoot]);

  const floatingActions = (
    <div
      className={classNames('controlFrameFloatingActions', {
        'controlFrameFloatingActions--twoLine': usingTwoLineLayout,
        'controlFrameFloatingActions--oneLine': !usingTwoLineLayout,
      })}
    >
      {!hasFatalError && embeddableType !== TIME_SLIDER_CONTROL && (
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
                removeEmbeddable(embeddableId);
              }
            })
          }
          iconType="cross"
          color="danger"
        />
      </EuiToolTip>
    </div>
  );

  const embeddableParentClassNames = classNames('controlFrame__control', {
    'controlFrame--twoLine': controlStyle === 'twoLine',
    'controlFrame--oneLine': controlStyle === 'oneLine',
    'controlFrame--fatalError': hasFatalError,
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
      {embeddable && (
        <div
          className={embeddableParentClassNames}
          id={`controlFrame--${embeddableId}`}
          ref={embeddableRoot}
        />
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
      {embeddable && enableActions && floatingActions}
      <EuiFormRow
        data-test-subj="control-frame-title"
        fullWidth
        label={
          usingTwoLineLayout
            ? title || ControlGroupStrings.emptyState.getTwoLineLoadingTitle()
            : undefined
        }
      >
        {form}
      </EuiFormRow>
    </>
  );
};
