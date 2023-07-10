/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useMemo } from 'react';
import { EuiScreenReaderOnly } from '@elastic/eui';

import {
  useSelectFromEmbeddableInput,
  useSelectFromOptionalEmbeddableInput,
} from '../use_select_from_embeddable';
import { isSelfStyledEmbeddable, ViewMode } from '../../lib';
import { getAriaLabelForTitle } from '../embeddable_panel_strings';
import { UnwrappedEmbeddablePanelProps, PanelUniversalActions } from '../types';
import { useEmbeddablePanelTitle } from './use_embeddable_panel_title';
import { useEmbeddablePanelBadges } from './use_embeddable_panel_badges';
import { useEmbeddablePanelContextMenu } from './use_embeddable_panel_context_menu';

export const EmbeddablePanelHeader = ({
  index,
  headerId,
  getActions,
  embeddable,
  actionPredicate,
  universalActions,
  showBadges = true,
  showNotifications = true,
}: UnwrappedEmbeddablePanelProps & {
  headerId: string;
  universalActions: PanelUniversalActions;
}) => {
  const selfStyledEmbeddableOptions = useMemo(
    () => (isSelfStyledEmbeddable(embeddable) ? embeddable.getSelfStyledOptions() : undefined),
    [embeddable]
  );

  const { notificationComponents, badgeComponents } = useEmbeddablePanelBadges(
    embeddable,
    getActions
  );
  const embeddablePanelContextMenu = useEmbeddablePanelContextMenu({
    index,
    embeddable,
    getActions,
    actionPredicate,
    universalActions,
  });

  const title = embeddable.getTitle();
  const viewMode = useSelectFromEmbeddableInput('viewMode', embeddable);
  const description = useSelectFromEmbeddableInput('description', embeddable);
  const hidePanelTitle = useSelectFromEmbeddableInput('hidePanelTitles', embeddable);
  const parentHidePanelTitle = useSelectFromOptionalEmbeddableInput(
    'hidePanelTitles',
    embeddable.parent
  );

  const hideTitle =
    Boolean(hidePanelTitle) ||
    Boolean(parentHidePanelTitle) ||
    Boolean(selfStyledEmbeddableOptions?.hideTitle) ||
    (viewMode === ViewMode.VIEW && !Boolean(title));

  const titleElement = useEmbeddablePanelTitle(
    embeddable,
    universalActions.customizePanel,
    hideTitle
  );

  const showPanelBar =
    !hideTitle ||
    description ||
    viewMode !== ViewMode.VIEW ||
    (badgeComponents?.length ?? 0) > 0 ||
    (notificationComponents?.length ?? 0) > 0;

  const ariaLabel = getAriaLabelForTitle(showPanelBar ? title : undefined);
  const ariaLabelElement = (
    <EuiScreenReaderOnly>
      <span id={headerId}>{ariaLabel}</span>
    </EuiScreenReaderOnly>
  );

  const headerClasses = classNames('embPanel__header', {
    'embPanel__header--floater': !showPanelBar,
  });

  const titleClasses = classNames('embPanel__title', {
    'embPanel--dragHandle': viewMode === ViewMode.EDIT,
  });

  if (!showPanelBar) {
    return (
      <div className={headerClasses}>
        {embeddablePanelContextMenu}
        {ariaLabelElement}
      </div>
    );
  }

  return (
    <figcaption
      className={headerClasses}
      data-test-subj={`embeddablePanelHeading-${(title || '').replace(/\s/g, '')}`}
    >
      <h2 data-test-subj="dashboardPanelTitle" className={titleClasses}>
        {ariaLabelElement}
        {titleElement}
        {showBadges && badgeComponents}
      </h2>
      {showNotifications && notificationComponents}
      {embeddablePanelContextMenu}
    </figcaption>
  );
};
