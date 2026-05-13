/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subscription, of } from 'rxjs';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiIcon,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HasCustomPrepend, PinnedControlLayoutState } from '@kbn/controls-schemas';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { EmbeddableRenderer, type DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects, type PublishingSubject } from '@kbn/presentation-publishing';
import {
  apiPublishesTooltipLabel,
  type PublishesTooltipLabel,
} from '@kbn/controls-schemas/src/types';
import type { ControlsRendererParentApi } from '../types';
import { apiPublishesLabel } from '../utils';
import { controlWidthStyles } from './control_panel.styles';
import { DragHandle } from './drag_handle';
import { FloatingActions } from './floating_actions';
import { ControlLabelTooltip } from './control_label_tooltip';
import { useIndicateRelatedPanelsSelector } from '../hooks';

export const ControlPanel = ({
  parentApi,
  control: { id, grow, width, type },
  setControlPanelRef,
}: {
  parentApi: ControlsRendererParentApi;
  control: Required<PinnedControlLayoutState>;
  setControlPanelRef: (id: string, ref: HTMLElement | null) => void;
}) => {
  const styles = useMemoCss(controlPanelStyles);

  const [api, setApi] = useState<
    (DefaultEmbeddableApi & Partial<HasCustomPrepend> & Partial<PublishesTooltipLabel>) | null
  >(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const [viewMode, disabledActionIds, arePanelsRelated, indicateRelatedPanelsId] =
    useBatchedPublishingSubjects(
      parentApi.viewMode$,
      parentApi.disabledActionIds$ ?? (of([] as string[]) as PublishingSubject<string[]>),
      parentApi.arePanelsRelated$ ?? (of(undefined) as PublishingSubject<undefined>),
      parentApi.indicateRelatedPanelsId$ ?? (of(undefined) as PublishingSubject<undefined>)
    );

  const [panelLabel, setPanelLabel] = useState<string | undefined>();
  const [panelTooltipLabel, setPanelTooltipLabel] = useState<string | undefined>();

  const prependWrapperRef = useRef<HTMLDivElement>(null);

  const indicateControl = useMemo(
    () =>
      api &&
      indicateRelatedPanelsId !== undefined &&
      arePanelsRelated?.(id, indicateRelatedPanelsId),
    [arePanelsRelated, id, indicateRelatedPanelsId, api]
  );
  const {
    canIndicateRelatedPanels,
    isIndicatingRelatedPanels,
    onToggleIndicateRelatedPanels,
    numberOfRelatedPanels,
  } = useIndicateRelatedPanelsSelector(api);

  useEffect(() => {
    if (!api) return;

    /** Setup subscriptions for necessary state once API is available */
    const subscriptions = new Subscription();
    if (apiPublishesLabel(api)) {
      subscriptions.add(
        api.label$.subscribe((result) => {
          setPanelLabel(result);
        })
      );
    }
    if (apiPublishesTooltipLabel(api)) {
      subscriptions.add(
        api.tooltipLabel$.subscribe((result) => {
          setPanelTooltipLabel(result);
        })
      );
    }
    return () => {
      subscriptions.unsubscribe();
    };
  }, [api]);

  const setRefs = useCallback(
    (ref: HTMLElement | null) => {
      setNodeRef(ref);
      setControlPanelRef(id, ref);
    },
    [id, setNodeRef, setControlPanelRef]
  );

  const onApiAvailable = useCallback(
    (controlApi: DefaultEmbeddableApi) => {
      setApi(controlApi);
      parentApi.registerChildApi(controlApi);
    },
    [parentApi]
  );

  const isEditable = viewMode === 'edit';
  const enableIndicateRelatedPanels = Boolean(canIndicateRelatedPanels && numberOfRelatedPanels);
  const handleToggleIndicateRelated = useCallback(
    () => (enableIndicateRelatedPanels ? onToggleIndicateRelatedPanels() : null),
    [enableIndicateRelatedPanels, onToggleIndicateRelatedPanels]
  );

  const controlLabel = (
    <ControlLabelTooltip
      canIndicateRelatedPanels={canIndicateRelatedPanels}
      isIndicatingRelatedPanels={isIndicatingRelatedPanels}
      numberOfRelatedPanels={numberOfRelatedPanels}
      panelLabel={panelLabel}
      panelTooltipLabel={panelTooltipLabel}
      anchorProps={{ className: 'eui-textTruncate', css: styles.tooltipStyles }}
    >
      <EuiFormLabel
        className="controlPanel--label"
        onClick={handleToggleIndicateRelated}
        onKeyDown={(e) =>
          e.key === 'Enter' || e.key === ' ' ? handleToggleIndicateRelated() : null
        }
        role={enableIndicateRelatedPanels ? 'button' : undefined}
        tabIndex={enableIndicateRelatedPanels ? 0 : undefined}
      >
        <span css={styles.prependWrapperStyles} ref={prependWrapperRef}>
          {panelLabel}
          {canIndicateRelatedPanels && numberOfRelatedPanels === 0 && (
            <>
              {' '}
              <EuiIcon
                size="s"
                aria-label={i18n.translate('controls.controlGroup.warningNoRelatedPanels', {
                  defaultMessage: 'Warning: No related panels',
                })}
                type="warning"
              />
            </>
          )}
        </span>
      </EuiFormLabel>
    </ControlLabelTooltip>
  );

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
        uuid={id}
        viewMode={viewMode}
        disabledActions={disabledActionIds}
        prependWrapperRef={prependWrapperRef}
      >
        <EuiFormRow
          data-test-subj="control-frame-title"
          fullWidth
          id={`control-title-${id}`}
          aria-label={i18n.translate('controls.controlGroup.controlFrameAriaLabel', {
            defaultMessage: 'Control for ${controlTitle}',
            values: { controlTitle: panelLabel },
          })}
        >
          <EuiFormControlLayout
            fullWidth
            className={classNames('controlFrame__formControlLayout', {
              'controlFrame__formControlLayout--edit': isEditable,
              'controlFrame__formControlLayout--focused': indicateControl,
              'controlFrame__formControlLayout--selected': isIndicatingRelatedPanels,
              type,
            })}
            css={styles.formControl}
            prepend={
              <>
                {api?.CustomPrependComponent ? (
                  <>
                    <DragHandle
                      isEditable={isEditable}
                      controlTitle={panelLabel}
                      className="controlFrame__dragHandle"
                      {...attributes}
                      {...listeners}
                    />
                    <api.CustomPrependComponent />
                  </>
                ) : (
                  <>
                    <DragHandle
                      isEditable={isEditable}
                      controlTitle={panelLabel}
                      className="controlFrame__dragHandle"
                      highContrast={isIndicatingRelatedPanels}
                      {...attributes}
                      {...listeners}
                    >
                      {!enableIndicateRelatedPanels && controlLabel}
                    </DragHandle>
                    {enableIndicateRelatedPanels && controlLabel}
                  </>
                )}
              </>
            }
            compressed={parentApi.isCompressed ? parentApi.isCompressed() : true}
          >
            <EmbeddableRenderer
              key={id}
              maybeId={id}
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
      '&.controlFrame__formControlLayout--focused': {
        outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.vis.euiColorVis0}`,
      },
      '&.controlFrame__formControlLayout--selected': {
        outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.vis.euiColorVis0}`,
        '&, & div, & button': {
          backgroundColor: euiTheme.colors.vis.euiColorVis1,
        },
      },
      '.controlPanel--label': {
        padding: '0 !important',
        height: '100%',
        maxWidth: '100%',
        '&[role="button"]': {
          cursor: 'pointer',
        },
      },
    }),
};
