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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subscription, distinctUntilChanged, map, of } from 'rxjs';

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
import type { HasCustomPrepend } from '@kbn/controls-schemas';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { EmbeddableRenderer, type DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiPublishesTitle,
  useBatchedPublishingSubjects,
  type PublishingSubject,
} from '@kbn/presentation-publishing';

import type { ControlPanelState, ControlsRendererParentApi } from '../types';
import { controlWidthStyles } from './control_panel.styles';
import { DragHandle } from './drag_handle';
import { FloatingActions } from './floating_actions';

export const ControlPanel = ({
  parentApi,
  uuid,
  type,
  setControlPanelRef,
}: {
  parentApi: ControlsRendererParentApi;
  uuid: string;
  type: string;
  setControlPanelRef: (id: string, ref: HTMLElement | null) => void;
}) => {
  const styles = useMemoCss(controlPanelStyles);

  const [api, setApi] = useState<(DefaultEmbeddableApi & Partial<HasCustomPrepend>) | null>(null);
  const initialState = useMemo(() => {
    return parentApi.layout$.getValue().controls[uuid];
  }, [parentApi, uuid]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: uuid,
  });

  const [viewMode, disabledActionIds] = useBatchedPublishingSubjects(
    parentApi.viewMode$,
    parentApi.disabledActionIds$ ?? (of([] as string[]) as PublishingSubject<string[]>)
  );
  const [grow, setGrow] = useState<ControlPanelState['grow']>(
    initialState.grow ?? DEFAULT_CONTROL_GROW
  );
  const [width, setWidth] = useState<ControlPanelState['width']>(
    initialState.width ?? DEFAULT_CONTROL_WIDTH
  );
  const [panelTitle, setPanelTitle] = useState<string | undefined>();
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string | undefined>();

  const prependWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stateSubscription = parentApi.layout$
      .pipe(
        map(({ controls }) => pick(controls[uuid], ['grow', 'width'])),
        distinctUntilChanged(deepEqual)
      )
      .subscribe((newState) => {
        setGrow(newState.grow ?? DEFAULT_CONTROL_GROW);
        setWidth(newState.width ?? DEFAULT_CONTROL_WIDTH);
      });

    return () => {
      stateSubscription.unsubscribe();
    };
  }, [parentApi, uuid]);

  useEffect(() => {
    if (!api) return;

    /** Setup subscriptions for necessary state once API is available */
    const subscriptions = new Subscription();
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

  const setRefs = useCallback(
    (ref: HTMLElement | null) => {
      setNodeRef(ref);
      setControlPanelRef(uuid, ref);
    },
    [uuid, setNodeRef, setControlPanelRef]
  );

  const onApiAvailable = useCallback(
    (controlApi: DefaultEmbeddableApi) => {
      setApi(controlApi);
      parentApi.registerChildApi(controlApi);
    },
    [parentApi]
  );

  const isEditable = viewMode === 'edit';
  return (
    <EuiFlexItem
      component="li"
      ref={setRefs}
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
      }}
      grow={Boolean(grow)}
      data-control-id={uuid}
      data-test-subj="control-frame"
      css={css([isDragging && styles.draggingItem, styles.controlWidthStyles])}
      className={classNames({
        'controlFrameWrapper--medium': width === 'medium',
        'controlFrameWrapper--small': width === 'small',
        'controlFrameWrapper--large': width === 'large',
      })}
    >
      <FloatingActions
        data-test-subj="control-frame-floating-actions"
        api={api}
        uuid={uuid}
        viewMode={viewMode}
        disabledActions={disabledActionIds}
        prependWrapperRef={prependWrapperRef}
      >
        <EuiFormRow
          data-test-subj="control-frame-title"
          fullWidth
          id={`control-title-${uuid}`}
          aria-label={i18n.translate('controls.controlGroup.controlFrameAriaLabel', {
            defaultMessage: 'Control for ${controlTitle}',
            values: { controlTitle: panelTitle },
          })}
        >
          <EuiFormControlLayout
            fullWidth
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

                {api?.CustomPrependComponent ? (
                  <api.CustomPrependComponent />
                ) : (
                  <EuiToolTip
                    content={panelTitle || defaultPanelTitle}
                    anchorProps={{ className: 'eui-textTruncate', css: styles.tooltipStyles }}
                  >
                    <EuiFormLabel className="controlPanel--label">
                      <span css={styles.prependWrapperStyles} ref={prependWrapperRef}>
                        {panelTitle || defaultPanelTitle}
                      </span>
                    </EuiFormLabel>
                  </EuiToolTip>
                )}
              </>
            }
            compressed={parentApi.isCompressed ? parentApi.isCompressed() : true}
          >
            <EmbeddableRenderer
              key={uuid}
              maybeId={uuid}
              type={type}
              getParentApi={() => parentApi}
              onApiAvailable={onApiAvailable}
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
  tooltipStyles: {
    height: '100%',
  },
  prependWrapperStyles: {
    display: 'inline-block',
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
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
