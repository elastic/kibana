/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useRef, useState } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { type DefaultEmbeddableApi, EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState } from '@kbn/presentation-containers';
import {
  type PublishesDisabledActionIds,
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';

import { PresentationPanelError } from '@kbn/presentation-panel-plugin/public';
import { controlWidthStyles } from './control_panel.styles';
import { DragHandle } from './drag_handle';
import { FloatingActions } from './floating_actions';

export const ControlPanel = <ApiType extends DefaultEmbeddableApi = DefaultEmbeddableApi>({
  parentApi,
  uuid,
  type,
  grow,
  width,
}: {
  parentApi: HasSerializedChildState<object> & Partial<PublishesDisabledActionIds>;
  uuid: string;
  type: string;
  grow: ControlsGroupState['controls'][number]['grow'];
  width: ControlsGroupState['controls'][number]['width'];
}) => {
  // const internalApi = useMemo(() => {
  //   const state = parentApi.getSerializedStateForChild(uuid);
  //   console.log({ state });
  // }, []);

  const panelRef = useRef<HTMLDivElement | null>(null);
  console.log({ panelRef: panelRef.current });
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
    activeIndex,
  } = useSortable({
    id: uuid,
  });

  const viewModeSubject = (() => {
    if (
      apiHasParentApi(api) &&
      apiHasParentApi(api.parentApi) && // api.parentApi => controlGroupApi
      apiPublishesViewMode(api.parentApi.parentApi) // controlGroupApi.parentApi => dashboardApi
    )
      return api.parentApi.parentApi.viewMode$; // get view mode from dashboard API
  })();

  const [
    dataLoading,
    blockingError,
    panelTitle,
    defaultPanelTitle,
    disabledActionIds,
    rawViewMode,
  ] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading$,
    api?.blockingError$,
    api?.title$,
    api?.defaultTitle$,
    parentApi.disabledActionIds$,
    viewModeSubject
  );

  const [initialLoadComplete, setInitialLoadComplete] = useState(!dataLoading);
  if (!initialLoadComplete && (dataLoading === false || (api && !api.dataLoading$))) {
    setInitialLoadComplete(true);
  }

  const viewMode = rawViewMode ?? 'view';
  const isEditable = viewMode === 'edit';
  const controlWidth = width ?? DEFAULT_CONTROL_WIDTH;
  const controlGrow = grow ?? DEFAULT_CONTROL_GROW;
  const controlLabel = undefined;
  // const hasRoundedBorders = !api?.CustomPrependComponent && !isEditable && isTwoLine;
  const shouldHideComponent = Boolean(blockingError);

  const insertBefore = isOver && (index ?? -1) < (activeIndex ?? -1);
  const insertAfter = isOver && (index ?? -1) > (activeIndex ?? -1);

  const styles = useMemoCss(controlPanelStyles);
  console.log({ isEditable });
  return (
    <EuiFlexItem
      component="li"
      ref={setNodeRef}
      style={{
        transition,
        transform: isSorting ? undefined : CSS.Translate.toString(transform),
      }}
      grow={controlGrow}
      data-control-id={uuid}
      data-test-subj="control-frame"
      data-render-complete="true"
      css={css([isDragging && styles.draggingItem, styles.controlWidthStyles])}
      className={classNames({
        'controlFrameWrapper--medium': controlWidth === 'medium',
        'controlFrameWrapper--small': controlWidth === 'small',
        'controlFrameWrapper--large': controlWidth === 'large',
      })}
    >
      <FloatingActions
        data-test-subj="control-frame-floating-actions"
        api={api}
        viewMode={viewMode}
        disabledActions={disabledActionIds}
        isEnabled={true}
      >
        <EuiFormRow
          data-test-subj="control-frame-title"
          fullWidth
          label={controlLabel}
          id={`control-title-${uuid}`}
          aria-label={`Control for ${controlLabel}`}
          css={css({
            '.euiFormControlLayout__childrenWrapper': {
              '.euiPopover, .euiFilterGroup': {
                // TODO: Remove options list styles
                height: '100%',
              },
            },
          })}
        >
          <EuiFormControlLayout
            fullWidth
            isLoading={Boolean(dataLoading)}
            className={classNames('controlFrame__formControlLayout', {
              'controlFrame__formControlLayout--edit': isEditable,
              'controlFrame_formControlAfter--insertBefore': insertBefore,
              'controlFrame_formControlAfter--insertAfter': insertAfter,
              type,
            })}
            // css={css(styles.formControl)}
            prepend={
              <>
                <DragHandle
                  isEditable={isEditable}
                  controlTitle={panelTitle || defaultPanelTitle}
                  {...attributes}
                  {...listeners}
                />
                {/* {api?.CustomPrependComponent ? (
                  <api.CustomPrependComponent />
                ) : */}
                <EuiToolTip
                  content={panelTitle || defaultPanelTitle}
                  anchorProps={{ className: 'eui-textTruncate' }}
                >
                  <EuiFormLabel className="controlPanel--label">
                    {panelTitle || defaultPanelTitle}
                  </EuiFormLabel>
                </EuiToolTip>
                {/* )} */}
              </>
            }
            // compressed={isCompressed(api)}
            compressed={true}
          >
            <div ref={panelRef} css={css({ height: '100%' })}>
              {blockingError && (
                // becaise we are hiding the panel chrome, we must handle blockingerrors manually
                <PresentationPanelError api={api} error={blockingError} panelRef={panelRef} />
              )}
              <span css={shouldHideComponent && styles.containerHidden}>
                <EmbeddableRenderer
                  key={uuid}
                  maybeId={uuid}
                  type={type}
                  getParentApi={() => parentApi}
                  onApiAvailable={(api) => {
                    setApi(api);
                    parentApi.registerChildApi(api);
                  }}
                  hidePanelChrome
                />
              </span>
            </div>
          </EuiFormControlLayout>
        </EuiFormRow>
      </FloatingActions>
    </EuiFlexItem>
  );
};

const controlPanelStyles = {
  draggingItem: css({
    opacity: 0,
  }),
  controlWidthStyles,
  containerHidden: css({
    display: 'none', // Don't unmount, just hide
  }),
};
