/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { distinctUntilChanged } from 'rxjs';

import { isEqual } from 'lodash';

import { FlexLayout } from '@kbn/grid-layout';
import type { FlexLayoutData, GridSettings } from '@kbn/grid-layout';

import { ControlPanel } from './components/control_panel';
import type { ControlsLayout, ControlsRendererParentApi } from './types';
import {
  apiPublishesFocusedPanelId,
  controlsLayoutToFlexLayout,
  flexLayoutToControlsLayout,
} from './utils';

const COMPRESSED_CONTROL_HEIGHT = 32;
const REGULAR_CONTROL_HEIGHT = 40;
const CONTROL_GUTTER_SIZE = 8;

export const ControlsRenderer = ({
  controls: controlState,
  onControlsChanged,
  parentApi,
}: {
  controls: ControlsLayout;
  onControlsChanged: (controls: ControlsLayout) => void;
  parentApi: ControlsRendererParentApi;
}) => {
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState(parentApi.viewMode$.getValue());

  const flexLayout = useMemo(() => controlsLayoutToFlexLayout(controlState), [controlState]);

  const gridSettings = useMemo<GridSettings>(
    () => ({
      gutterSize: CONTROL_GUTTER_SIZE,
      rowHeight:
        parentApi.isCompressed && !parentApi.isCompressed()
          ? REGULAR_CONTROL_HEIGHT
          : COMPRESSED_CONTROL_HEIGHT,
      columnCount: 1,
      keyboardDragTopLimit: 0,
    }),
    [parentApi]
  );

  useEffect(() => {
    const viewModeSubscription = parentApi.viewMode$.subscribe(setViewMode);
    return () => viewModeSubscription.unsubscribe();
  }, [parentApi]);

  useEffect(() => {
    if (parentApi && apiPublishesFocusedPanelId(parentApi)) {
      const focusedPanelIdSubscription = parentApi.focusedPanelId$
        .pipe(distinctUntilChanged())
        .subscribe((focusId) => setIsEditFlyoutOpen(Boolean(focusId)));
      return () => focusedPanelIdSubscription.unsubscribe();
    }
  }, [parentApi]);

  const onLayoutChange = useCallback(
    (newFlexLayout: FlexLayoutData) => {
      const newControlsLayout = flexLayoutToControlsLayout(newFlexLayout, controlState);
      // the flex layout emits its initial layout, so only propagate real changes
      if (!isEqual(newControlsLayout, controlState)) onControlsChanged(newControlsLayout);
    },
    [controlState, onControlsChanged]
  );

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const control = controlState.controls[id];
      if (!control) return null;
      return (
        <ControlPanel
          parentApi={parentApi}
          control={{ ...control, id }}
          setDragHandles={setDragHandles}
        />
      );
    },
    [controlState, parentApi]
  );

  if (Object.keys(flexLayout).length === 0) {
    return null;
  }

  return (
    <FlexLayout
      layout={flexLayout}
      gridSettings={gridSettings}
      onLayoutChange={onLayoutChange}
      accessMode={viewMode === 'edit' ? 'EDIT' : 'VIEW'}
      renderPanelContents={renderPanelContents}
      useCustomDragHandle={true}
      className={`controlGroup ${isEditFlyoutOpen ? 'controlsGroup--editing' : ''}`}
      css={controlsGroupStyles.controlsGroup}
    />
  );
};

const controlsGroupStyles = {
  controlsGroup: ({ euiTheme }: UseEuiTheme) =>
    css`
      --controlsActivePanelBorderStyle: ${euiTheme.border.width.thick} solid
        ${euiTheme.colors.vis.euiColorVis0};

      padding-top: 0;

      &.controlsGroup--editing .controlFrameFloatingActions {
        visibility: hidden !important;
      }

      .kbnFlexPanel--dragPreview {
        border-radius: ${euiTheme.border.radius.control};
        background-color: ${transparentize(euiTheme.colors.vis.euiColorVis0, 0.2)};
      }

      .kbnFlexPanel--active {
        outline: var(--controlsActivePanelBorderStyle);
        border-radius: ${euiTheme.border.radius.control};
      }

      .kbnFlexPanel--resizeHandle {
        height: 100%;
        width: ${euiTheme.size.m};
        right: 1px;
        top: 2px;
        &:hover {
          border-radius: 0 ${euiTheme.border.radius.control} ${euiTheme.border.radius.control} 0;
          border: var(--controlsActivePanelBorderStyle);
          border-left: none;
        }
      }

      // styles for the size gauge that appears when resizing
      .kbnFlexPanel--resizeGauge {
        padding: ${euiTheme.size.xs};
        z-index: ${euiTheme.levels.menu};
        border-top-right-radius: ${euiTheme.border.radius.control};
        height: 100%;
        display: flex;
        align-items: center;

        .kbnFlexPanel--resizeGauge--inner {
          padding: ${euiTheme.size.xxs} ${euiTheme.size.xs};
          height: ${euiTheme.size.l};
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: ${euiTheme.colors.backgroundLightAccentSecondary};
          border-radius: ${euiTheme.border.radius.control};
        }

        .kbnFlexPanel--resizeGauge--text {
          font-weight: ${euiTheme.font.weight.medium};
          color: ${euiTheme.colors.textAccentSecondary};
        }
      }
    `,
};
