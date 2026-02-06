/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription, of } from 'rxjs';

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
import type { HasCustomPrepend, PinnedControlLayoutState } from '@kbn/controls-schemas';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { EmbeddableRenderer, type DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiPublishesTitle,
  useBatchedPublishingSubjects,
  type PublishingSubject,
} from '@kbn/presentation-publishing';

import type { ControlsRendererParentApi } from '../types';
import { controlWidthStyles } from './control_panel.styles';
import { DragHandle } from './drag_handle';
import { FloatingActions } from './floating_actions';

export const ControlPanel = ({
  parentApi,
  control: { uid, grow, width, type },
  setControlPanelRef,
}: {
  parentApi: ControlsRendererParentApi;
  control: Required<PinnedControlLayoutState>;
  setControlPanelRef: (id: string, ref: HTMLElement | null) => void;
}) => {
  const styles = useMemoCss(controlPanelStyles);

  const [api, setApi] = useState<(DefaultEmbeddableApi & Partial<HasCustomPrepend>) | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: uid,
  });

  const [viewMode, disabledActionIds] = useBatchedPublishingSubjects(
    parentApi.viewMode$,
    parentApi.disabledActionIds$ ?? (of([] as string[]) as PublishingSubject<string[]>)
  );

  const [panelTitle, setPanelTitle] = useState<string | undefined>();
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string | undefined>();

  const prependWrapperRef = useRef<HTMLDivElement>(null);

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
      setControlPanelRef(uid, ref);
    },
    [uid, setNodeRef, setControlPanelRef]
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
      data-test-subj="control-frame"
      css={css([isDragging && styles.draggingItem, styles.controlWidthStyles])}
      className={`controlFrameWrapper--${width}`}
    >
      <FloatingActions
        data-test-subj="control-frame-floating-actions"
        api={api}
        uuid={uid}
        viewMode={viewMode}
        disabledActions={disabledActionIds}
        prependWrapperRef={prependWrapperRef}
      >
        <EuiFormRow
          data-test-subj="control-frame-title"
          fullWidth
          id={`control-title-${uid}`}
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
              key={uid}
              maybeId={uid}
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
