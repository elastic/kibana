/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { AppHeaderBack } from '@kbn/app-header';
import {
  TransferAction,
  type EmbeddableEditorService,
} from '../../../../plugin_imports/embeddable_editor_service';

/**
 * Returns true if the session is being edited from an embeddable.
 * (Do not confuse with Discover displayMode: 'embedded')
 */
export const isEmbeddableEdition = (embeddableEditor: EmbeddableEditorService): boolean =>
  embeddableEditor.isEmbeddedEditor() && Boolean(embeddableEditor.getEmbeddableId());

/**
 * Back navigation when editing a Discover session from an embeddable (Today it's only from a dashboard).
 */
export const getChromeHeaderBack = (
  embeddableEditor: EmbeddableEditorService
): AppHeaderBack | undefined => {
  if (!isEmbeddableEdition(embeddableEditor)) {
    return undefined;
  }

  const originatingPath = embeddableEditor.getOriginatingPath() ?? '#/';

  return {
    href: originatingPath,
    onClick: () => embeddableEditor.transferBackToEditor(TransferAction.Cancel),
    label: i18n.translate('discover.titleDashboardEditionBackLabel', {
      defaultMessage: 'Dashboard',
    }),
  };
};

/**
 * Returns the title to display in the Chrome App Header.
 */
export const getChromeHeaderTitle = ({
  embeddableEditor,
  sessionTitle,
}: {
  embeddableEditor: EmbeddableEditorService;
  sessionTitle?: string;
}): string => {
  // When editting a session from an ambeddable.
  if (isEmbeddableEdition(embeddableEditor)) {
    const title =
      embeddableEditor.getByValueTab()?.label || // Session persisted by value inside a dashboard.
      sessionTitle || // Session eddited by reference: it exists outise a particular dashboard.
      i18n.translate('discover.DiscoverSessionTitle', {
        // I.E: editting a by-value session that has no name.
        defaultMessage: 'Discover session',
      });

    return i18n.translate('discover.editDiscoverSessionWithTitle', {
      defaultMessage: 'Editing {title}',
      values: { title },
    });
  }

  // Opening a saved session.
  if (sessionTitle) {
    return sessionTitle;
  }

  // New unsaved session.
  return i18n.translate('discover.pageTitleNewSession', {
    defaultMessage: 'New session',
  });
};
