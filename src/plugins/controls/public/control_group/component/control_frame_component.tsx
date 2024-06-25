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
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiLoadingChart,
  EuiToolTip,
} from '@elastic/eui';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { FloatingActions } from '@kbn/presentation-util-plugin/public';

import { useChildEmbeddable } from '../../hooks/use_child_embeddable';
import {
  controlGroupSelector,
  useControlGroupContainer,
} from '../embeddable/control_group_container';
import { ControlError } from './control_error_component';

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

  const controlGroup = useControlGroupContainer();

  const controlStyle = controlGroupSelector((state) => state.explicitInput.controlStyle);
  const viewMode = controlGroupSelector((state) => state.explicitInput.viewMode);
  const disabledActions = controlGroupSelector((state) => state.explicitInput.disabledActions);

  const embeddable = useChildEmbeddable({
    untilEmbeddableLoaded: controlGroup.untilEmbeddableLoaded.bind(controlGroup),
    embeddableType,
    embeddableId,
  });

  const [title, setTitle] = useState<string>();

  const usingTwoLineLayout = controlStyle === 'twoLine';

  useEffect(() => {
    let mounted = true;
    if (embeddableRoot.current) {
      embeddable?.render(embeddableRoot.current);
    }
    const inputSubscription = embeddable?.getInput$().subscribe((newInput) => {
      if (mounted) setTitle(newInput.title);
    });
    return () => {
      mounted = false;
      inputSubscription?.unsubscribe();
    };
  }, [embeddable, embeddableRoot]);

  const embeddableParentClassNames = classNames('controlFrame__control', {
    'controlFrame--twoLine': controlStyle === 'twoLine',
    'controlFrame--oneLine': controlStyle === 'oneLine',
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
        >
          {isErrorEmbeddable(embeddable) && <ControlError error={embeddable.error} />}
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
    <FloatingActions
      className={classNames({
        'controlFrameFloatingActions--twoLine': usingTwoLineLayout,
        'controlFrameFloatingActions--oneLine': !usingTwoLineLayout,
      })}
      viewMode={viewMode}
      api={embeddable}
      disabledActions={disabledActions}
      isEnabled={embeddable && enableActions}
    >
      <EuiFormRow
        data-test-subj="control-frame-title"
        fullWidth
        label={usingTwoLineLayout ? title || '...' : undefined}
      >
        {form}
      </EuiFormRow>
    </FloatingActions>
  );
};
