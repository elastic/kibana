/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { css } from '@emotion/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiFormRow,
  EuiToolTip,
  UseEuiTheme,
} from '@elastic/eui';
import {
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import { useMemoizedStyles } from '@kbn/core/public';
import { FloatingActions } from './floating_actions';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '../../../common';

import { ControlPanelProps, DefaultControlApi } from '../../controls/types';
import { ControlError } from './control_error';
import { isCompressed } from '../utils/is_compressed';
import { controlPanelWidthStyles, responsiveControlWidthStyles } from './control_panel.styles';
import { DragHandle } from './drag_handle';

export const ControlPanel = <ApiType extends DefaultControlApi = DefaultControlApi>({
  Component,
  uuid,
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
    grow,
    width,
    labelPosition,
    disabledActionIds,
    rawViewMode,
  ] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading$,
    api?.blockingError$,
    api?.title$,
    api?.defaultTitle$,
    api?.grow$,
    api?.width$,
    api?.parentApi?.labelPosition,
    api?.parentApi?.disabledActionIds$,
    viewModeSubject
  );
  const isTwoLine = labelPosition === 'twoLine';
  const controlType = api ? api.type : undefined;

  const [initialLoadComplete, setInitialLoadComplete] = useState(!dataLoading);
  if (!initialLoadComplete && (dataLoading === false || (api && !api.dataLoading$))) {
    setInitialLoadComplete(true);
  }

  const viewMode = rawViewMode ?? 'view';
  const isEditable = viewMode === 'edit';
  const controlWidth = width ?? DEFAULT_CONTROL_WIDTH;
  const controlGrow = grow ?? DEFAULT_CONTROL_GROW;
  const hasRoundedBorders = !api?.CustomPrependComponent && !isEditable && isTwoLine;
  const shouldHideComponent = Boolean(blockingError);

  const insertBefore = isOver && (index ?? -1) < (activeIndex ?? -1);
  const insertAfter = isOver && (index ?? -1) > (activeIndex ?? -1);

  const styles = useMemoizedStyles(controlPanelStyles);

  return (
    <EuiFlexItem
      ref={setNodeRef}
      style={{
        transition,
        transform: isSorting ? undefined : CSS.Translate.toString(transform),
      }}
      grow={controlGrow}
      data-control-id={uuid}
      data-test-subj="control-frame"
      data-render-complete="true"
      css={css([
        isDragging && styles.draggingItem,
        styles.responsiveControlWidthStyles,
        controlPanelWidthStyles(controlWidth),
      ])}
    >
      <FloatingActions
        data-test-subj="control-frame-floating-actions"
        api={api}
        isTwoLine={isTwoLine}
        viewMode={viewMode}
        disabledActions={disabledActionIds}
        isEnabled={true}
      >
        <EuiFormRow
          data-test-subj="control-frame-title"
          fullWidth
          label={isTwoLine ? panelTitle || defaultPanelTitle || '...' : undefined}
        >
          <EuiFormControlLayout
            fullWidth
            isLoading={Boolean(dataLoading)}
            className={controlType}
            css={css([
              styles.formControl,
              isEditable
                ? isTwoLine
                  ? styles.formControlEditableTwoLines
                  : styles.formControlEditableOneLine
                : isTwoLine
                ? styles.formControlNonEditableTwoLines
                : styles.formControlNonEditableOneLine,
              (insertBefore || insertAfter) && styles.formControlAfter,
              insertBefore && styles.afterInsertBefore,
              insertAfter && styles.afterInsertAfter,
            ])}
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
                ) : isTwoLine ? null : (
                  <EuiToolTip
                    content={panelTitle || defaultPanelTitle}
                    anchorProps={{ css: styles.tooltipAnchor }}
                  >
                    <EuiFormLabel css={styles.formLabel} className="eui-textTruncate">
                      {panelTitle || defaultPanelTitle}
                    </EuiFormLabel>
                  </EuiToolTip>
                )}
              </>
            }
            compressed={isCompressed(api)}
          >
            <>
              {blockingError && <ControlError error={blockingError} />}
              <Component
                className="controlPanel"
                css={css([
                  styles.containerBase,
                  hasRoundedBorders && styles.containerRoundedBorders,
                  shouldHideComponent && styles.containerHidden,
                ])}
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

const controlPanelStyles = {
  containerBase: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      maxInlineSize: '100% !important',
      height: euiTheme.size.xl,
      boxShadow: 'none !important',
      borderRadius: `0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 !important`,
    }),
  containerRoundedBorders: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderRadius: `${euiTheme.border.radius.medium} !important`,
    }),
  containerHidden: css({
    display: 'none', // Don't unmount, just hide
  }),
  formLabel: css({
    padding: '0 !important',
    height: '100%',
    maxWidth: '100%',
    overflow: 'hidden !important',
    textOverflow: 'ellipsis !important',
    whiteSpace: `nowrap !important` as 'nowrap',
  }),
  formControl: css({
    '.euiFormControlLayout__prepend': {
      paddingLeft: 0,
      gap: 0,
      '&.timeSlider': {
        paddingInlineStart: `0 !important`,
      },
    },
  }),
  formControlEditableTwoLines: css({
    '.euiFormControlLayout__prepend': {
      paddingInlineStart: `0 !important`,
      paddingInlineEnd: `0 !important`,
    },
  }),
  formControlEditableOneLine: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.euiFormControlLayout__prepend': {
        paddingInlineStart: `${euiTheme.size.xxs} !important`, // corrected syntax for skinny icon
      },
    }),
  formControlNonEditableTwoLines: css({
    '.euiFormControlLayout__prepend': {
      paddingInline: `0 !important`,
    },
  }),
  formControlNonEditableOneLine: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.euiFormControlLayout__prepend': {
        paddingInlineStart: `${euiTheme.size.s} !important`,
      },
    }),
  formControlAfter: ({ euiTheme }: UseEuiTheme) =>
    css({
      '&:after': {
        content: "''",
        position: 'absolute' as const,
        borderRadius: euiTheme.border.radius.medium,
        top: 0,
        bottom: 0,
        width: euiTheme.size.xxs,
        backgroundColor: euiTheme.colors.backgroundFilledAccentSecondary,
      },
    }),
  afterInsertBefore: ({ euiTheme }: UseEuiTheme) =>
    css({
      '&:after': {
        left: `calc(-${euiTheme.size.xs} - 1px)`,
      },
    }),
  afterInsertAfter: ({ euiTheme }: UseEuiTheme) =>
    css({
      '&:after': {
        right: `calc(-${euiTheme.size.xs} - 1px)`,
      },
    }),
  tooltipAnchor: css({
    height: '100%',
  }),
  draggingItem: css({
    opacity: 0,
  }),
  responsiveControlWidthStyles,
};
