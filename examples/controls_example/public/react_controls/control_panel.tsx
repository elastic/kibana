/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useEffect, useState } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedOptionalPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { FloatingActions } from '@kbn/presentation-util-plugin/public';

import { ControlError } from './control_error_component';
import { ControlPanelProps, DefaultControlApi } from './types';

import './control_panel.scss';
import { DragInfo } from './control_renderer';
import { ControlWidth } from '@kbn/controls-plugin/common';

/**
 * TODO: Handle dragging
 */
const DragHandle = ({
  isEditable,
  controlTitle,
  hideEmptyDragHandle,
}: {
  isEditable: boolean;
  controlTitle?: string;
  hideEmptyDragHandle: boolean;
}) =>
  isEditable ? (
    <button
      aria-label={i18n.translate('controls.controlGroup.ariaActions.moveControlButtonAction', {
        defaultMessage: 'Move control {controlTitle}',
        values: { controlTitle: controlTitle ?? '' },
      })}
      className="controlFrame__dragHandle"
    >
      <EuiIcon type="grabHorizontal" />
    </button>
  ) : hideEmptyDragHandle ? null : (
    <EuiIcon size="s" type="empty" />
  );

export const ControlPanel = <ApiType extends DefaultControlApi = DefaultControlApi>({
  Component,
  uuid,
  dragInfo,
}: ControlPanelProps<ApiType>) => {
  const [api, setApi] = useState<ApiType | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isOver,
    isDragging,
    index,
    isSorting,
    over,
  } = useSortable({
    id: uuid,
  });

  useEffect(() => {
    console.log('OVER', over);
  }, [over]);

  const style = {
    transition,
    transform: isSorting ? undefined : CSS.Translate.toString(transform),
  };

  const viewModeSubject = (() => {
    if (
      apiHasParentApi(api) &&
      apiHasParentApi(api.parentApi) && // api.parentApi => controlGroupApi
      apiPublishesViewMode(api.parentApi.parentApi) // controlGroupApi.parentApi => dashboardApi
    )
      return api.parentApi.parentApi.viewMode; // get view mode from dashboard API
  })();

  const [
    dataLoading,
    blockingError,
    panelTitle,
    defaultPanelTitle,
    grow,
    width,
    labelPosition,
    rawViewMode,
  ] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading,
    api?.blockingError,
    api?.panelTitle,
    api?.defaultPanelTitle,
    api?.grow,
    api?.width,
    api?.parentApi?.labelPosition,
    viewModeSubject
  );
  const usingTwoLineLayout = labelPosition === 'twoLine';

  const [initialLoadComplete, setInitialLoadComplete] = useState(!dataLoading);
  if (!initialLoadComplete && (dataLoading === false || (api && !api.dataLoading))) {
    setInitialLoadComplete(true);
  }

  const viewMode = (rawViewMode ?? ViewMode.VIEW) as ViewMode;
  const isEditable = viewMode === ViewMode.EDIT;

  return (
    <EuiFlexItem
      ref={setNodeRef}
      style={style}
      grow={grow}
      {...attributes}
      {...listeners}
      data-control-id={api?.uuid}
      data-test-subj={`control-frame`}
      data-render-complete="true"
      className={classNames('controlFrameWrapper', {
        'controlFrameWrapper--grow': grow,
        'controlFrameWrapper--small': width === 'small',
        'controlFrameWrapper--medium': width === 'medium',
        'controlFrameWrapper--large': width === 'large',
        'controlFrameWrapper--insertBefore':
          isOver && (index ?? -1) < (dragInfo.draggingIndex ?? -1),
        'controlFrameWrapper--insertAfter':
          isOver && (index ?? -1) > (dragInfo.draggingIndex ?? -1),
        'controlFrameWrapper-isDragging': isDragging,
      })}
    >
      <FloatingActions
        api={api}
        className={classNames({
          'controlFrameFloatingActions--twoLine': usingTwoLineLayout,
          'controlFrameFloatingActions--oneLine': !usingTwoLineLayout,
        })}
        viewMode={viewMode}
        disabledActions={[]}
        isEnabled={true}
      >
        <EuiFormRow
          data-test-subj="control-frame-title"
          fullWidth
          label={usingTwoLineLayout ? panelTitle || defaultPanelTitle || '...' : undefined}
        >
          <EuiFormControlLayout
            fullWidth
            className="controlFrame__formControlLayout"
            isLoading={Boolean(dataLoading)}
            prepend={
              <>
                <DragHandle
                  isEditable={isEditable}
                  controlTitle={panelTitle || defaultPanelTitle}
                  hideEmptyDragHandle={usingTwoLineLayout || Boolean(api?.CustomPrependComponent)}
                />

                {api?.CustomPrependComponent ? (
                  <api.CustomPrependComponent />
                ) : usingTwoLineLayout ? null : (
                  <EuiToolTip
                    anchorClassName="controlPanel--labelWrapper"
                    content={panelTitle || defaultPanelTitle}
                  >
                    <EuiFormLabel className="controlPanel--label">
                      {panelTitle || defaultPanelTitle}
                    </EuiFormLabel>
                  </EuiToolTip>
                )}
              </>
            }
          >
            <>
              {blockingError && (
                <ControlError
                  error={
                    blockingError ??
                    i18n.translate('controls.blockingError', {
                      defaultMessage: 'There was an error loading this control.',
                    })
                  }
                />
              )}
              <Component
                className={classNames('controlPanel', {
                  'controlPanel--roundedBorders':
                    !api?.CustomPrependComponent && !isEditable && usingTwoLineLayout,
                  'controlPanel--hideComponent': Boolean(blockingError), // don't want to unmount component on error; just hide it
                })}
                ref={(newApi) => {
                  if (newApi && !api) setApi(newApi);
                }}
              />
            </>
          </EuiFormControlLayout>
        </EuiFormRow>
      </FloatingActions>
    </EuiFlexItem>
  );
};

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title, because individual controls can be any size, and dragging a wide item
 * can be quite cumbersome.
 */
export const ControlClone = ({
  controlStyle,
  controlApi,
}: {
  controlStyle: string;
  controlApi: DefaultControlApi;
}) => {
  console.log('controlApi', controlApi);
  const width = useStateFromPublishingSubject(controlApi.width);
  // const panels = controlGroupSelector((state) => state.explicitInput.panels);
  // const controlStyle = controlGroupSelector((state) => state.explicitInput.controlStyle);

  // const width = panels[draggingId].width;
  // const title = panels[draggingId].explicitInput.title;
  return (
    <EuiFlexItem
      className={classNames('controlFrameCloneWrapper', {
        'controlFrameCloneWrapper--small': width === 'small',
        'controlFrameCloneWrapper--medium': width === 'medium',
        'controlFrameCloneWrapper--large': width === 'large',
        'controlFrameCloneWrapper--twoLine': controlStyle === 'twoLine',
      })}
    >
      {controlStyle === 'twoLine' ? <EuiFormLabel>{'TITLE'}</EuiFormLabel> : undefined}
      <EuiFlexGroup responsive={false} gutterSize="none" className={'controlFrame__draggable'}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grabHorizontal" className="controlFrame__dragHandle" />
        </EuiFlexItem>
        {controlStyle === 'oneLine' ? (
          <EuiFlexItem>
            <label className="controlFrameCloneWrapper__label">{'TITLE'}</label>
          </EuiFlexItem>
        ) : undefined}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
