/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import deepEqual from 'fast-deep-equal';
import { pick } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { Subscription, distinctUntilChanged, map, of, type BehaviorSubject } from 'rxjs';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiToolTip,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DashboardLayout } from '@kbn/dashboard-plugin/public/dashboard_api/layout_manager';
import { EmbeddableRenderer, type DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializedChildState } from '@kbn/presentation-containers';
import {
  apiPublishesDataLoading,
  apiPublishesTitle,
  useBatchedPublishingSubjects,
  type PublishesDisabledActionIds,
  type PublishesViewMode,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

import type { ControlPanelState } from '../types';
import { controlWidthStyles } from './control_panel.styles';
import { DragHandle } from './drag_handle';
import { FloatingActions } from './floating_actions';

export const ControlPanel = ({
  parentApi,
  uuid,
  type,
  compressed,
  setControlPanelRef,
  uiActions,
}: {
  parentApi: PublishesViewMode &
    HasSerializedChildState<object> &
    Partial<PublishesDisabledActionIds> & {
      registerChildApi: (api: DefaultEmbeddableApi) => void;
      layout$: BehaviorSubject<DashboardLayout>;
    };
  uuid: string;
  type: string;
  compressed?: boolean;
  uiActions: UiActionsStart;
  setControlPanelRef?: (id: string, ref: HTMLElement | null) => void;
}) => {
  const [api, setApi] = useState<DefaultEmbeddableApi | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: uuid,
  });

  const [viewMode, disabledActionIds] = useBatchedPublishingSubjects(
    parentApi.viewMode$,
    parentApi.disabledActionIds$ ?? (of([] as string[]) as PublishingSubject<string[]>)
  );
  const [panelTitle, setPanelTitle] = useState<string | undefined>();
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string | undefined>();
  const [dataLoading, setDataLoading] = useState<boolean | undefined>();

  const initialState = useMemo(() => {
    return parentApi.layout$.getValue().controls[uuid];
  }, [parentApi, uuid]);
  const [grow, setGrow] = useState<ControlPanelState['grow']>(initialState.grow);
  const [width, setWidth] = useState<ControlPanelState['width']>(initialState.width);

  useEffect(() => {
    const stateSubscription = parentApi.layout$
      .pipe(
        map(({ controls }) => pick(controls[uuid], ['grow', 'width'])),
        distinctUntilChanged(deepEqual)
      )
      .subscribe((newState) => {
        setGrow(newState.grow);
        setWidth(newState.width);
      });

    return () => {
      stateSubscription.unsubscribe();
    };
  }, [parentApi, uuid]);

  useEffect(() => {
    if (!api) return;

    /** Setup subscriptions for necessary state once API is available */
    const subscriptions = new Subscription();

    if (apiPublishesDataLoading(api)) {
      subscriptions.add(
        api.dataLoading$.subscribe((result) => {
          setDataLoading(result);
        })
      );
    }
    if (apiPublishesTitle(api)) {
      subscriptions.add(
        api.title$.subscribe((result) => {
          setPanelTitle(result);
        })
      );
      if (api.defaultTitle$) {
        subscriptions.add(
          api.defaultTitle$.subscribe((result) => {
            setDefaultPanelTitle(result);
          })
        );
      }
    }
    return () => {
      subscriptions.unsubscribe();
    };
  }, [api]);

  const isEditable = viewMode === 'edit';
  const controlWidth = width ?? DEFAULT_CONTROL_WIDTH;
  const controlGrow = grow ?? DEFAULT_CONTROL_GROW;
  const controlLabel = undefined;

  const styles = useMemoCss(controlPanelStyles);

  return (
    <EuiFlexItem
      component="li"
      ref={(ref: HTMLElement | null) => {
        setNodeRef(ref);
        setControlPanelRef?.(uuid, ref);
      }}
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
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
        uuid={uuid}
        viewMode={viewMode}
        disabledActions={disabledActionIds}
        isEnabled={true}
        uiActions={uiActions}
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
              type,
            })}
            css={styles.formControl}
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
            compressed={compressed}
          >
            <EmbeddableRenderer
              key={uuid}
              maybeId={uuid}
              type={type}
              getParentApi={() => parentApi}
              onApiAvailable={(controlApi) => {
                setApi(controlApi);
                parentApi.registerChildApi(controlApi);
              }}
              hidePanelChrome
            />
          </EuiFormControlLayout>
        </EuiFormRow>
      </FloatingActions>
    </EuiFlexItem>
  );
};

const controlPanelStyles = {
  draggingItem: css({
    opacity: 0,
    visibility: 'hidden',
  }),
  controlWidthStyles,
  formControl: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.euiFormControlLayout__prepend': {
        paddingLeft: 0,
        gap: 0,
        '&.timeSlider': {
          paddingInlineStart: `0 !important`,
        },
        '.euiFormControlLayout__prepend': {
          // non-editable
          paddingInlineStart: `${euiTheme.size.s} !important`,
        },
      },
      '&.controlFrame__formControlLayout--edit': {
        // editable
        '.euiFormControlLayout__prepend': {
          paddingInlineStart: `${euiTheme.size.xxs} !important`, // corrected syntax for skinny icon
        },
      },
      '.controlPanel--label': {
        padding: '0 !important',
        height: '100%',
        maxWidth: '100%',
      },
    }),
};
