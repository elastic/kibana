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

import {
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
import {
  apiCanCancelRequests,
  apiPublishesRelatedPanels,
  useBatchedPublishingSubjects,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import {
  apiPublishesTooltipLabel,
  type PublishesTooltipLabel,
} from '@kbn/controls-schemas/src/types';
import type { ControlsRendererParentApi } from '../types';
import { apiPublishesLabel } from '../utils';
import { DragHandle } from './drag_handle';
import { FloatingActions } from './floating_actions';
import { ControlLabelTooltip } from './control_label_tooltip';
import { useIndicateRelatedPanelsSelector } from '../hooks';

export const ControlPanel = ({
  parentApi,
  control: { id, type },
  setDragHandles,
}: {
  parentApi: ControlsRendererParentApi;
  control: Required<PinnedControlLayoutState>;
  setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}) => {
  const styles = useMemoCss(controlPanelStyles);

  const [api, setApi] = useState<
    (DefaultEmbeddableApi & Partial<HasCustomPrepend> & Partial<PublishesTooltipLabel>) | null
  >(null);

  const [viewMode, disabledActionIds, relatedPanelsIndicatorId] = useBatchedPublishingSubjects(
    parentApi.viewMode$,
    parentApi.disabledActionIds$ ?? (of([] as string[]) as PublishingSubject<string[]>),
    parentApi.relatedPanelsIndicatorId$ ?? (of(undefined) as PublishingSubject<undefined>)
  );

  const [panelLabel, setPanelLabel] = useState<string | undefined>();
  const [panelTooltipLabel, setPanelTooltipLabel] = useState<string | undefined>();
  const [selectedPanelRelatedPanels, setSelectedPanelRelatedPanels] = useState<string[]>([]);

  const prependWrapperRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // the drag handle only exists while editing; the flex layout wires its drag events to it
    setDragHandles?.([dragHandleRef.current]);
  }, [setDragHandles, api, viewMode]);

  useEffect(() => {
    return () => {
      if (api && apiCanCancelRequests(api)) {
        api.cancelRequests();
      }
    };
  }, [api]);

  const selectedPanel = useMemo(
    () =>
      relatedPanelsIndicatorId &&
      Object.entries(parentApi.children$.value).find(
        ([key]) => key === relatedPanelsIndicatorId
      )?.[1],
    [parentApi.children$.value, relatedPanelsIndicatorId]
  );
  const indicateControl = useMemo(
    () =>
      Boolean(
        api && // Check to make sure onApiAvailable has returned; control panels initialize their own apis internally
          selectedPanel &&
          apiPublishesRelatedPanels(selectedPanel) &&
          selectedPanelRelatedPanels.includes(id)
      ),
    [api, selectedPanel, selectedPanelRelatedPanels, id]
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
    if (apiPublishesRelatedPanels(selectedPanel)) {
      subscriptions.add(selectedPanel.relatedPanels$.subscribe(setSelectedPanelRelatedPanels));
    } else {
      setSelectedPanelRelatedPanels([]);
    }
    return () => {
      subscriptions.unsubscribe();
    };
  }, [api, selectedPanel]);

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
                className="controlLabel__warning-icon"
              />
            </>
          )}
        </span>
      </EuiFormLabel>
    </ControlLabelTooltip>
  );

  return (
    <div data-test-subj="control-frame" css={styles.controlFrame}>
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
                      dragHandleRef={dragHandleRef}
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
                      dragHandleRef={dragHandleRef}
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
    </div>
  );
};

const controlPanelStyles = {
  controlFrame: css({
    width: '100%',
    height: '100%',
  }),
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
        outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}`,
        backgroundColor: euiTheme.colors.backgroundLightPrimary,
        '& div, & button': {
          backgroundColor: 'transparent',
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
      '.controlLabel__warning-icon': {
        // Warning icon has a tiny bit of whitespace at the top which makes it look visually off-center with the text next
        // to it when "correctly" aligned, so nudge it upward by a subpixel. -1px is too much, but -0.5px manages to trick
        // most browser engines' anti-aliasing into aligning the icon just right
        transform: 'translateY(-0.5px)',
      },
    }),
};
