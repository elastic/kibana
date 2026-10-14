/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ViewMode } from '@kbn/presentation-publishing';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DefaultPresentationPanelApi, PresentationPanelProps } from '../types';
import { apiCanSelectPanels } from './can_select_panels';
import { PresentationPanelTitle } from './presentation_panel_title';
import { useBadges } from './use_badges';

// max pointer travel (px) between mousedown and click for it to count as a click rather than a drag
const CLICK_MOVE_TOLERANCE = 4;
const INTERACTIVE_ELEMENT_SELECTOR = 'a, button, input, [role="button"]';

export type PresentationPanelHeaderProps<ApiType extends DefaultPresentationPanelApi> = {
  api: ApiType;
  headerId: string;
  viewMode?: ViewMode;
  hideTitle?: boolean;
  panelTitle?: string;
  panelDescription?: string;
  setDragHandle: (id: string, ref: HTMLDivElement | null) => void;
  smartTitleActive?: boolean;
  breakdownFieldName?: string;
} & Pick<PresentationPanelProps, 'showBadges' | 'getActions' | 'titleHighlight'>;

export const PresentationPanelHeader = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi
>({
  api,
  viewMode,
  headerId,
  getActions,
  hideTitle,
  panelTitle,
  panelDescription,
  setDragHandle,
  showBadges = true,
  titleHighlight,
  smartTitleActive,
  breakdownFieldName,
}: PresentationPanelHeaderProps<ApiType>) => {
  const { euiTheme } = useEuiTheme();

  const badges = useBadges<ApiType>(showBadges, api, getActions);

  const [titleElement, setTitleElement] = useState<HTMLDivElement | null>(null);

  const memoizedSetDragHandle = useCallback(
    // memoize the ref callback so that we don't call `setDragHandle` on every render
    (ref: HTMLDivElement | null) => {
      setTitleElement(ref);
      setDragHandle('panelHeader', ref);
    },
    [setDragHandle]
  );

  const selectionParentApi = apiCanSelectPanels(api.parentApi) ? api.parentApi : undefined;

  // a plain click (not a drag) on the title's empty area toggles panel selection
  useEffect(() => {
    if (!titleElement || viewMode !== 'edit' || !selectionParentApi) return;

    let pointerDownPosition: { x: number; y: number } | null = null;
    const onMouseDown = (event: MouseEvent) => {
      pointerDownPosition = { x: event.clientX, y: event.clientY };
    };
    const onClick = (event: MouseEvent) => {
      const start = pointerDownPosition;
      pointerDownPosition = null;
      if (!start || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if ((event.target as HTMLElement).closest(INTERACTIVE_ELEMENT_SELECTOR)) return;
      const moved =
        Math.abs(event.clientX - start.x) > CLICK_MOVE_TOLERANCE ||
        Math.abs(event.clientY - start.y) > CLICK_MOVE_TOLERANCE;
      if (moved) return;
      selectionParentApi.togglePanelSelection(api.uuid);
    };

    titleElement.addEventListener('mousedown', onMouseDown);
    titleElement.addEventListener('click', onClick);
    return () => {
      titleElement.removeEventListener('mousedown', onMouseDown);
      titleElement.removeEventListener('click', onClick);
    };
  }, [titleElement, viewMode, selectionParentApi, api.uuid]);

  const { captionStyles, headerStyles } = useMemo(() => {
    return {
      captionStyles: css`
        .dshLayout--editing &:hover {
          cursor: move;
          background-color: ${transparentize(euiTheme.colors.backgroundBasePrimary, 0.5)};
        }
      `,
      headerStyles: css`
        height: ${euiTheme.size.xxl};
        overflow: hidden;
        line-height: ${euiTheme.size.xl};
        padding-top: 0;
        padding-right: ${euiTheme.size.s};
        padding-bottom: 0;
        padding-left: ${euiTheme.size.base};

        display: flex;
        flex-wrap: nowrap;
        column-gap: ${euiTheme.size.s};
        align-items: center;
        // all direct children now share the available parent width equally, ensuring consistent layout regardless of their content length
        > * {
          min-width: 0;
          flex: 1 !important;
          max-width: fit-content !important;
        }
      `,
    };
  }, [euiTheme.size, euiTheme.colors]);

  const showPanelBar = (!hideTitle && panelTitle) || badges.length > 0;

  if (!showPanelBar) return null;

  return (
    <figcaption
      data-test-subj={`embeddablePanelHeading-${(panelTitle || '').replace(/\s/g, '')}`}
      className={'embPanel__header'}
      css={captionStyles}
    >
      <div
        className="embPanel__title"
        ref={memoizedSetDragHandle}
        data-test-subj="dashboardPanelTitle"
        css={headerStyles}
      >
        <PresentationPanelTitle
          api={api}
          headerId={headerId}
          viewMode={viewMode}
          hideTitle={hideTitle}
          panelTitle={panelTitle}
          panelDescription={panelDescription}
          titleHighlight={titleHighlight}
          smartTitleActive={smartTitleActive}
          breakdownFieldName={breakdownFieldName}
        />
        {showBadges && badges}
      </div>
    </figcaption>
  );
};
