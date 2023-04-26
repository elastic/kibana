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
  EuiButtonEmpty,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiLoadingChart,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Markdown } from '@kbn/kibana-react-plugin/public';
import { FloatingActions } from '@kbn/presentation-util-plugin/public';

import {
  controlGroupSelector,
  useControlGroupContainer,
} from '../embeddable/control_group_container';
import { ControlGroupStrings } from '../control_group_strings';
import { useChildEmbeddable } from '../../hooks/use_child_embeddable';

interface ControlFrameErrorProps {
  error: Error;
}

const ControlFrameError = ({ error }: ControlFrameErrorProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const popoverButton = (
    <EuiButtonEmpty
      color="danger"
      iconSize="m"
      iconType="error"
      onClick={() => setPopoverOpen((open) => !open)}
      className={'errorEmbeddableCompact__button'}
      textProps={{ className: 'errorEmbeddableCompact__text' }}
    >
      <FormattedMessage
        id="controls.frame.error.message"
        defaultMessage="An error occurred. View more"
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={popoverButton}
      isOpen={isPopoverOpen}
      className="errorEmbeddableCompact__popover"
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
  const [fatalError, setFatalError] = useState<Error>();

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
    <FloatingActions
      className={classNames({
        'controlFrameFloatingActions--twoLine': usingTwoLineLayout,
        'controlFrameFloatingActions--oneLine': !usingTwoLineLayout,
      })}
      viewMode={viewMode}
      embeddable={embeddable}
      disabledActions={disabledActions}
      isEnabled={embeddable && enableActions}
    >
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
    </FloatingActions>
  );
};
