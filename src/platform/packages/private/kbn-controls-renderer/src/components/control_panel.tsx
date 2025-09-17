/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { type Subscription, of } from 'rxjs';

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
import { EmbeddableRenderer, type DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState, PresentationContainer } from '@kbn/presentation-containers';
import {
  type PublishesViewMode,
  apiPublishesDataLoading,
  apiPublishesTitle,
  useBatchedPublishingSubjects,
  type PublishesDisabledActionIds,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import { PresentationPanelHoverActionsWrapper } from '@kbn/presentation-panel-plugin/public';

import { controlWidthStyles } from './control_panel.styles';
import { DragHandle } from './drag_handle';
import { FloatingActions } from './floating_actions';
import type { Action } from '@kbn/ui-actions-plugin/public/actions';

export const ControlPanel = ({
  parentApi,
  uuid,
  type,
  grow,
  width,
  compressed,
}: {
  parentApi: PresentationContainer &
    PublishesViewMode &
    HasSerializedChildState<object> &
    Partial<PublishesDisabledActionIds> & {
      registerChildApi: (api: DefaultEmbeddableApi) => void;
    };
  uuid: string;
  type: string;
  grow: ControlsGroupState['controls'][number]['grow'];
  width: ControlsGroupState['controls'][number]['width'];
  compressed?: boolean;
}) => {
  const [api, setApi] = useState<DefaultEmbeddableApi | null>(null);
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

  const [viewMode, disabledActionIds] = useBatchedPublishingSubjects(
    parentApi.viewMode$,
    parentApi?.disabledActionIds$ ?? (of([] as string[]) as PublishingSubject<string[]>)
  );
  const [panelTitle, setPanelTitle] = useState<string | undefined>();
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string | undefined>();
  const [dataLoading, setDataLoading] = useState<boolean | undefined>();

  useEffect(() => {
    if (!api) return;

    /** Setup subscriptions for necessary state once API is available */
    const subscriptions: Subscription[] = [];
    if (apiPublishesDataLoading(api)) {
      subscriptions.push(
        api.dataLoading$.subscribe((result) => {
          setDataLoading(result);
        })
      );
    }
    if (apiPublishesTitle(api)) {
      subscriptions.push(
        api.title$.subscribe((result) => {
          setPanelTitle(result);
        })
      );
      if (api.defaultTitle$) {
        subscriptions.push(
          api.defaultTitle$.subscribe((result) => {
            setDefaultPanelTitle(result);
          })
        );
      }
    }
    return () => {
      subscriptions.forEach((subscription) => subscription?.unsubscribe());
    };
  }, [api]);

  const isEditable = viewMode === 'edit';
  const controlWidth = width ?? DEFAULT_CONTROL_WIDTH;
  const controlGrow = grow ?? DEFAULT_CONTROL_GROW;
  const controlLabel = undefined;
  // const hasRoundedBorders = !api?.CustomPrependComponent && !isEditable && isTwoLine;

  const insertBefore = isOver && (index ?? -1) < (activeIndex ?? -1);
  const insertAfter = isOver && (index ?? -1) > (activeIndex ?? -1);

  const styles = useMemoCss(controlPanelStyles);

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
      <PresentationPanelHoverActionsWrapper
        {...{
          index,
          api,
          getActions: async () => {
            return [] as Action[];
          },
          viewMode,
          showNotifications: false,
          showBorder: false,
          // ...attributes,
          // ...listeners,
        }}
        setDragHandle={(id: string, ref: HTMLElement | null) => {
          if (!ref) return;
          console.log({ id, ref });
          for (const [title, attribute] of Object.entries(attributes)) {
            ref.setAttribute(title, attribute);
          }
          // for (const [title, listener] of Object.entries(listeners)) {
          //   console.log({ ref, title, listener });
          //   ref.addEventListener(title, (e) => listener(e));
          // }
          console.log(listeners);
          ref.addEventListener('pointerdown', (e) => {
            listeners?.onPointerDown?.(e);
          });
          ref.addEventListener('keydown', (e) => {
            listeners?.onKeyDown?.(e);
          });
        }}
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
            css={css(styles.formControl)}
            prepend={
              <>
                {/* <DragHandle
                  isEditable={isEditable}
                  controlTitle={panelTitle || defaultPanelTitle}
                  {...attributes}
                  {...listeners}
                /> */}
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
            compressed={compressed}
          >
            <EmbeddableRenderer
              key={uuid}
              maybeId={uuid}
              type={type}
              getParentApi={() => parentApi}
              onApiAvailable={(panelApi) => {
                const newPanelApi = {
                  ...panelApi,
                  serializeState: () => {
                    return { rawState: { ...panelApi.serializeState().rawState, grow, width } };
                  },
                };
                setApi(newPanelApi);
                parentApi.registerChildApi(newPanelApi);
              }}
              hidePanelChrome
            />
          </EuiFormControlLayout>
        </EuiFormRow>
      </PresentationPanelHoverActionsWrapper>
    </EuiFlexItem>
  );
};

const controlPanelStyles = {
  draggingItem: css({
    opacity: 0,
  }),
  controlWidthStyles,
};
