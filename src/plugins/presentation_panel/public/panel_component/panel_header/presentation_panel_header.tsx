/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { ViewMode } from '@kbn/presentation-publishing';
import classNames from 'classnames';
import React from 'react';
import { getAriaLabelForTitle } from '../presentation_panel_strings';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from '../types';
import { PresentationPanelContextMenu } from './presentation_panel_context_menu';
import { PresentationPanelTitle } from './presentation_panel_title';
import { usePresentationPanelHeaderActions } from './use_presentation_panel_header_actions';

export type PresentationPanelHeaderProps<ApiType extends DefaultPresentationPanelApi> = {
  api: ApiType;
  headerId: string;
  viewMode?: ViewMode;
  hideTitle?: boolean;
  panelTitle?: string;
  panelDescription?: string;
} & Pick<
  PresentationPanelInternalProps,
  'index' | 'showBadges' | 'getActions' | 'actionPredicate' | 'showNotifications'
>;

export const PresentationPanelHeader = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi
>({
  api,
  index,
  viewMode,
  headerId,
  getActions,
  hideTitle,
  panelTitle,
  panelDescription,
  actionPredicate,
  showBadges = true,
  showNotifications = true,
}: PresentationPanelHeaderProps<ApiType>) => {
  const { notificationElements, badgeElements } = usePresentationPanelHeaderActions<ApiType>(
    showNotifications,
    showBadges,
    api,
    getActions
  );

  const showPanelBar =
    !hideTitle ||
    panelDescription ||
    viewMode !== 'view' ||
    badgeElements.length > 0 ||
    notificationElements.length > 0;

  const ariaLabel = getAriaLabelForTitle(showPanelBar ? panelTitle : undefined);
  const ariaLabelElement = (
    <EuiScreenReaderOnly>
      <span id={headerId}>{ariaLabel}</span>
    </EuiScreenReaderOnly>
  );

  const headerClasses = classNames('embPanel__header', {
    'embPanel__header--floater': !showPanelBar,
  });

  const titleClasses = classNames('embPanel__title', {
    'embPanel--dragHandle': viewMode === 'edit',
  });

  const contextMenuElement = (
    <PresentationPanelContextMenu {...{ index, api, getActions, actionPredicate }} />
  );

  if (!showPanelBar) {
    return (
      <div data-test-subj={`embeddablePanelHeading`} className={headerClasses}>
        {contextMenuElement}
        {ariaLabelElement}
      </div>
    );
  }

  return (
    <figcaption
      className={headerClasses}
      data-test-subj={`embeddablePanelHeading-${(panelTitle || '').replace(/\s/g, '')}`}
    >
      <h2 data-test-subj="dashboardPanelTitle" className={titleClasses}>
        {ariaLabelElement}
        <PresentationPanelTitle
          api={api}
          viewMode={viewMode}
          hideTitle={hideTitle}
          panelTitle={panelTitle}
          panelDescription={panelDescription}
        />
        {showBadges && badgeElements}
      </h2>
      {showNotifications && notificationElements}
      {contextMenuElement}
    </figcaption>
  );
};
