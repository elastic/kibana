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

import { ControlGroupInput } from '../types';
import { EditControlButton } from '../editor/edit_control';
import { useChildEmbeddable } from '../../hooks/use_child_embeddable';
import { useReduxContainerContext } from '../../../redux_embeddables/redux_embeddable_context';
import { ControlGroupStrings } from '../control_group_strings';
import { pluginServices } from '../../../../services';

export interface ControlFrameProps {
  customPrepend?: JSX.Element;
  enableActions?: boolean;
  embeddableId: string;
}

export const ControlFrame = ({ customPrepend, enableActions, embeddableId }: ControlFrameProps) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);
  const {
    useEmbeddableSelector,
    containerActions: { untilEmbeddableLoaded, removeEmbeddable },
  } = useReduxContainerContext<ControlGroupInput>();
  const { controlStyle } = useEmbeddableSelector((state) => state);

  // Presentation Services Context
  const { overlays } = pluginServices.getHooks();
  const { openConfirm } = overlays.useService();

  const embeddable = useChildEmbeddable({ untilEmbeddableLoaded, embeddableId });

  const [title, setTitle] = useState<string>();

  const usingTwoLineLayout = controlStyle === 'twoLine';

  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
    const subscription = embeddable?.getInput$().subscribe((newInput) => setTitle(newInput.title));
    return () => {
      subscription?.unsubscribe();
    };
  }, [embeddable, embeddableRoot]);

  const floatingActions = (
    <div
      className={classNames('controlFrameFloatingActions', {
        'controlFrameFloatingActions--twoLine': usingTwoLineLayout,
        'controlFrameFloatingActions--oneLine': !usingTwoLineLayout,
      })}
    >
      <EuiToolTip content={ControlGroupStrings.floatingActions.getEditButtonTitle()}>
        <EditControlButton embeddableId={embeddableId} />
      </EuiToolTip>
      <EuiToolTip content={ControlGroupStrings.floatingActions.getRemoveButtonTitle()}>
        <EuiButtonIcon
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
  });

  const form = (
    <EuiFormControlLayout
      className={'controlFrame__formControlLayout'}
      fullWidth
      prepend={
        <>
          {(embeddable && customPrepend) ?? null}
          {usingTwoLineLayout ? undefined : (
            <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
              {title}
            </EuiFormLabel>
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
