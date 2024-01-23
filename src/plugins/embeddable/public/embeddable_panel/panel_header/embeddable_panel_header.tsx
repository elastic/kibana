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

import { isSelfStyledEmbeddable, ViewMode } from '../../lib';
import { EmbeddablePanelTitle } from './embeddable_panel_title';
import { getAriaLabelForTitle } from '../embeddable_panel_strings';
import { useEmbeddablePanelBadges } from './use_embeddable_panel_badges';
import { useSelectFromEmbeddableInput } from '../use_select_from_embeddable';
import { EmbeddablePanelContextMenu } from './embeddable_panel_context_menu';
import { UnwrappedEmbeddablePanelProps, PanelUniversalActions } from '../types';

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
    showNotifications,
    showBadges,
    embeddable,
    getActions
  );

  const title = embeddable.getTitle();
  const description = embeddable.getDescription();
  const viewMode = useSelectFromEmbeddableInput('viewMode', embeddable);
  const hidePanelTitle = useSelectFromEmbeddableInput('hidePanelTitles', embeddable);
  const parentHidePanelTitle = useSelectFromEmbeddableInput('hidePanelTitles', embeddable.parent);

  const hideTitle =
    Boolean(hidePanelTitle) ||
    Boolean(parentHidePanelTitle) ||
    Boolean(selfStyledEmbeddableOptions?.hideTitle) ||
    (viewMode === ViewMode.VIEW && !Boolean(title));

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

  const embeddablePanelContextMenu = (
    <EmbeddablePanelContextMenu
      {...{ index, embeddable, getActions, actionPredicate, universalActions }}
    />
  );

  if (!showPanelBar) {
    return (
      <div data-test-subj={`embeddablePanelHeading`} className={headerClasses}>
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
        <EmbeddablePanelTitle
          viewMode={viewMode}
          hideTitle={hideTitle}
          embeddable={embeddable}
          description={description}
          editPanelAction={universalActions.editPanel}
        />
        {showBadges && badgeComponents}
      </h2>
      {showNotifications && notificationComponents}
      {embeddablePanelContextMenu}
    </figcaption>
  );
};
