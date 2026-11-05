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

import {
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ControlLabelTooltip } from '@kbn/controls-renderer';
import { apiPublishesLabel } from '@kbn/controls-renderer/src/utils';
import { HasCustomPrepend } from '@kbn/controls-schemas';
import { PublishesTooltipLabel } from '@kbn/controls-schemas/src/types';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { DefaultEmbeddableApi, EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiCanCancelRequests,
  apiPublishesTitle,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { combineLatest, of, Subscription } from 'rxjs';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import { DragHandle } from './pinned_panel_drag_handle';
import { FloatingActions } from './floating_actions';

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
  const prependWrapperRef = useRef<HTMLDivElement>(null);

  const [api, setApi] = useState<
    (DefaultEmbeddableApi & Partial<HasCustomPrepend> & Partial<PublishesTooltipLabel>) | null
  >(null);

  const [viewMode] = useBatchedPublishingSubjects(dashboardApi.viewMode$);
  const [panelLabel, setPanelLabel] = useState<string>('');

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
    return () => {
      subscriptions.unsubscribe();
    };
  }, [api]);

  const onApiAvailable = useCallback(
    (controlApi: DefaultEmbeddableApi) => {
      setApi(controlApi);
      dashboardApi.registerChildApi(controlApi);
    },
    [dashboardApi]
  );

  const isEditable = viewMode === 'edit';

  const controlLabel = (
    <ControlLabelTooltip
      panelLabel={panelLabel}
      anchorProps={{ className: 'eui-textTruncate', css: styles.tooltipStyles }}
    >
      <EuiFormLabel className="controlPanel--label">
        <span css={styles.prependWrapperStyles}>{panelLabel}</span>
      </EuiFormLabel>
    </ControlLabelTooltip>
  );

  return (
    <EuiFlexItem
      component="li"
      grow={false}
      data-test-subj="control-frame"
      // css={css([isDragging && styles.draggingItem, styles.controlWidthStyles])}
    >
      <FloatingActions
        data-test-subj="control-frame-floating-actions"
        api={api}
        uuid={id}
        viewMode={viewMode}
        // disabledActions={disabledActionIds}
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
              type,
            })}
            css={styles.formControl}
            prepend={
              <>
                {api?.CustomPrependComponent ? (
                  <>
                    <DragHandle
                      isEditable={viewMode === 'edit'}
                      controlTitle={'Test'}
                      setDragHandles={setDragHandles}
                    />
                    <api.CustomPrependComponent />
                  </>
                ) : (
                  <>
                    <DragHandle
                      isEditable={viewMode === 'edit'}
                      controlTitle={panelLabel}
                      setDragHandles={setDragHandles}
                    >
                      {controlLabel}
                    </DragHandle>
                  </>
                )}
              </>
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
  draggingItem: css({
    opacity: 0,
    visibility: 'hidden',
  }),
  // controlWidthStyles,
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
function setPanelTooltipLabel(result: string) {
  throw new Error('Function not implemented.');
}
