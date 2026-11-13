/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiFlexItem,
  EuiIcon,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  transparentize,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ControlLabelTooltip,
  FloatingActions,
  useIndicateRelatedPanelsSelector,
} from '@kbn/controls-renderer';
import { apiPublishesLabel } from '@kbn/controls-renderer/src/utils';
import type { HasCustomPrepend } from '@kbn/controls-schemas';
import type { PublishesTooltipLabel } from '@kbn/controls-schemas/src/types';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiCanCancelRequests,
  apiPublishesRelatedPanels,
  apiPublishesTitle,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { combineLatest, of, Subscription } from 'rxjs';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import { DragHandle } from './pinned_panel_drag_handle';

export const PinnedPanel = ({
  id,
  type,
  setDragHandles,
}: {
  id: string;
  type: string;
  setDragHandles: (refs: Array<HTMLElement | null>) => void;
}) => {
  const styles = useMemoCss(controlPanelStyles);
  const dashboardApi = useDashboardApi();

  const [api, setApi] = useState<
    (DefaultEmbeddableApi & Partial<HasCustomPrepend> & Partial<PublishesTooltipLabel>) | null
  >(null);

  const [viewMode, relatedPanelsIndicatorId] = useBatchedPublishingSubjects(
    dashboardApi.viewMode$,
    dashboardApi.relatedPanelsIndicatorId$
  );
  const [panelLabel, setPanelLabel] = useState<string>('');
  const [selectedPanelRelatedPanels, setSelectedPanelRelatedPanels] = useState<string[]>([]);

  const selectedPanel = useMemo(
    () =>
      relatedPanelsIndicatorId ? dashboardApi.children$.value[relatedPanelsIndicatorId] : undefined,
    [dashboardApi.children$.value, relatedPanelsIndicatorId]
  );
  const indicatePanel = Boolean(
    api && // onApiAvailable may not have returned yet
      apiPublishesRelatedPanels(selectedPanel) &&
      selectedPanelRelatedPanels.includes(id)
  );
  const {
    canIndicateRelatedPanels,
    isIndicatingRelatedPanels,
    onToggleIndicateRelatedPanels,
    numberOfRelatedPanels,
  } = useIndicateRelatedPanelsSelector(api);

  useEffect(() => {
    return () => {
      if (api && apiCanCancelRequests(api)) {
        api.cancelRequests();
      }
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;

    /** Setup subscriptions for necessary state once API is available */
    const subscriptions = new Subscription();
    subscriptions.add(
      combineLatest([
        apiPublishesTitle(api) ? api.title$.asObservable() : of(undefined),
        apiPublishesTitle(api) ? api.defaultTitle$?.asObservable() ?? of(undefined) : of(undefined),
        apiPublishesLabel(api) ? api.label$.asObservable() : of(undefined),
      ]).subscribe(([title = '', defaultTitle = '', label = '']) => {
        setPanelLabel(title || label || defaultTitle);
      })
    );
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
      dashboardApi.registerChildApi(controlApi);
    },
    [dashboardApi]
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
        <span css={styles.prependWrapperStyles}>
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
    <EuiFlexItem component="li" grow={false} data-test-subj="control-frame">
      <FloatingActions
        data-test-subj="control-frame-floating-actions"
        api={api}
        uuid={id}
        viewMode={viewMode}
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
            compressed={true}
            fullWidth
            className={classNames('controlFrame__formControlLayout', {
              'controlFrame__formControlLayout--edit': isEditable,
              'controlFrame__formControlLayout--focused': indicatePanel,
              'controlFrame__formControlLayout--selected': isIndicatingRelatedPanels,
              type,
            })}
            css={styles.formControl}
            prepend={
              api?.CustomPrependComponent ? (
                <>
                  <DragHandle
                    isEditable={isEditable}
                    controlTitle={panelLabel}
                    setDragHandles={setDragHandles}
                  />
                  <api.CustomPrependComponent />
                </>
              ) : (
                <DragHandle
                  isEditable={isEditable}
                  controlTitle={panelLabel}
                  highContrast={isIndicatingRelatedPanels}
                  setDragHandles={setDragHandles}
                >
                  {controlLabel}
                </DragHandle>
              )
            }
          >
            <EmbeddableRenderer
              type={type}
              maybeId={id}
              getParentApi={() => dashboardApi}
              key={`${type}_${id}`}
              panelProps={{
                isSharedItem: false,
                showBadges: false,
                showBorder: true,
                showShadow: false,
              }}
              onApiAvailable={onApiAvailable}
              hidePanelChrome={true}
            />
          </EuiFormControlLayout>
        </EuiFormRow>
      </FloatingActions>
    </EuiFlexItem>
  );
};

const controlPanelStyles = {
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
      '.controlFrame__dragHandle': { overflow: 'hidden' },
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
          '&:hover': {
            backgroundColor: transparentize(euiTheme.colors.vis.euiColorVis0, 0.1),
          },
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
        '&.controlFrame__formControlLayout--edit .euiFormControlLayout__prepend:hover': {
          backgroundColor: euiTheme.colors.backgroundLightPrimary,
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
