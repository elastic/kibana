/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIconTip, EuiScreenReaderOnly } from '@elastic/eui';
import { ViewMode } from '@kbn/presentation-publishing';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import React, { useCallback } from 'react';
import { placeholderTitle } from './presentation_panel_title';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';
import { PresentationPanelTitle } from './presentation_panel_title';
import { usePresentationPanelHeaderActions } from './use_presentation_panel_header_actions';

const getAriaLabelForTitle = (title?: string) => {
  return title
    ? i18n.translate('presentationPanel.enhancedAriaLabel', {
        defaultMessage: 'Panel: {title}',
        values: { title: title || placeholderTitle },
      })
    : i18n.translate('presentationPanel.ariaLabel', {
        defaultMessage: 'Panel',
      });
};

export type PresentationPanelHeaderProps<ApiType extends DefaultPresentationPanelApi> = {
  api: ApiType;
  headerId: string;
  viewMode?: ViewMode;
  hideTitle?: boolean;
  panelTitle?: string;
  panelDescription?: string;
  setDragHandle: (id: string, ref: HTMLDivElement | null) => void;
} & Pick<PresentationPanelInternalProps, 'showBadges' | 'getActions' | 'showNotifications'>;

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
  showNotifications = true,
}: PresentationPanelHeaderProps<ApiType>) => {
  const { notificationElements, badgeElements } = usePresentationPanelHeaderActions<ApiType>(
    showNotifications,
    showBadges,
    api,
    getActions
  );

  const memoizedSetDragHandle = useCallback(
    // memoize the ref callback so that we don't call `setDragHandle` on every render
    (ref: HTMLHeadingElement | null) => {
      setDragHandle('panelHeader', ref);
    },
    [setDragHandle]
  );

  const showPanelBar =
    (!hideTitle && panelTitle) || badgeElements.length > 0 || notificationElements.length > 0;

  if (!showPanelBar) return null;

  const ariaLabel = getAriaLabelForTitle(showPanelBar ? panelTitle : undefined);
  const ariaLabelElement = (
    <EuiScreenReaderOnly>
      <span id={headerId}>{ariaLabel}</span>
    </EuiScreenReaderOnly>
  );

  const headerClasses = classNames('embPanel__header', {
    'embPanel--dragHandle': viewMode === 'edit',
    'embPanel__header--floater': !showPanelBar,
  });

  const titleClasses = classNames('embPanel__title', {
    'embPanel--dragHandle': viewMode === 'edit',
  });

  return (
    <figcaption
      className={headerClasses}
      data-test-subj={`embeddablePanelHeading-${(panelTitle || '').replace(/\s/g, '')}`}
    >
      <div
        ref={memoizedSetDragHandle}
        data-test-subj="dashboardPanelTitle"
        className={titleClasses}
      >
        <h2 className="embPanel__titleInner" data-test-subj="embeddablePanelTitleInner">
          {ariaLabelElement}
          <PresentationPanelTitle
            api={api}
            viewMode={viewMode}
            hideTitle={hideTitle}
            panelTitle={panelTitle}
          />
        </h2>
        {panelDescription && (
          <EuiIconTip
            title={!hideTitle ? panelTitle || undefined : undefined}
            content={panelDescription}
            delay="regular"
            position="top"
            anchorClassName="embPanel__titleTooltipAnchor"
            anchorProps={{ 'data-test-subj': 'embeddablePanelTooltipAnchor' }}
            type="iInCircle"
            color="subdued"
            iconProps={{
              'data-test-subj': 'embeddablePanelTitleDescriptionIcon',
            }}
          />
        )}
        {showBadges && badgeElements}
        {showNotifications && notificationElements}
      </div>
    </figcaption>
  );
};
