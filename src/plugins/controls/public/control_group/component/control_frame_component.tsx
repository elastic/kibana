/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiButtonIcon,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiLoadingChart,
  EuiToolTip,
} from '@elastic/eui';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';

import { pluginServices } from '../../services';
import { ControlInput } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupReduxState } from '../types';
import { EditControlButton } from './edit_control';
import { useChildEmbeddable } from './use_child_embeddable';

export interface ControlFrameProps {
  customPrepend?: JSX.Element;
  embeddableId: string;
  embeddableType: string;
  enableActions?: boolean;
}

export const ControlFrame = ({
  customPrepend,
  embeddableId,
  embeddableType,
  enableActions,
}: ControlFrameProps) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);
  const [hasFatalError, setHasFatalError] = useState(false);
  const [title, setTitle] = useState<string>();

  const {
    useEmbeddableSelector: select,
    containerActions: { untilEmbeddableLoaded, removeEmbeddable },
  } = useReduxContainerContext<ControlGroupReduxState>();

  const controlStyle = select((state) => state.explicitInput.controlStyle);

  // Controls Services Context
  const { overlays } = pluginServices.getHooks();
  const { openConfirm } = overlays.useService();

  const embeddable = useChildEmbeddable({ untilEmbeddableLoaded, embeddableId, embeddableType });

  const usingTwoLineLayout = controlStyle === 'twoLine';

  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
    const inputSubscription = embeddable
      ?.getInput$()
      .subscribe((newInput: ControlInput) => setTitle(newInput.title));
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
      {!hasFatalError && (
        <EuiToolTip content={ControlGroupStrings.floatingActions.getEditButtonTitle()}>
          <EditControlButton embeddableId={embeddableId} />
        </EuiToolTip>
      )}
      <EuiToolTip content={ControlGroupStrings.floatingActions.getRemoveButtonTitle()}>
        <EuiButtonIcon
          aria-label={ControlGroupStrings.floatingActions.getRemoveButtonTitle()}
          color="danger"
          data-test-subj={`control-action-${embeddableId}-delete`}
          iconType="cross"
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
        />
      </EuiToolTip>
    </div>
  );

  const embeddableParentClassNames = classNames('controlFrame__control', {
    'controlFrame--twoLine': controlStyle === 'twoLine',
    'controlFrame--oneLine': controlStyle === 'oneLine',
    'controlFrame--fatalError': hasFatalError,
  });

  const form = (
    <EuiFormControlLayout
      className={classNames('controlFrame__formControlLayout', {
        'controlFrameFormControlLayout--twoLine': controlStyle === 'twoLine',
      })}
      fullWidth
      prepend={
        <>
          {(embeddable && customPrepend) ?? null}
          {usingTwoLineLayout ? undefined : (
            <EuiToolTip anchorClassName="controlFrame__labelToolTip" content={title}>
              <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
                {title}
              </EuiFormLabel>
            </EuiToolTip>
          )}
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
