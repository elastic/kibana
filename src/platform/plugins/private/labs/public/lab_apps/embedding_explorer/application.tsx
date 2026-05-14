/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { InstalledLabsService } from '../../services/installed_labs_service';
import type { LabUnmount } from '../../types';
import { EMBEDDING_EXPLORER_LAB_ID } from '../../../common';
import { EmbeddingExplorerApp } from './components/embedding_explorer_app';

interface RenderEmbeddingExplorerAppArgs {
  coreStart: CoreStart;
  installedLabsService: InstalledLabsService;
  params: AppMountParameters;
}

export const renderApp = async ({
  coreStart,
  installedLabsService,
  params,
}: RenderEmbeddingExplorerAppArgs): Promise<LabUnmount> => {
  const isInstalled = await installedLabsService.isInstalled(EMBEDDING_EXPLORER_LAB_ID);

  if (!isInstalled) {
    coreStart.notifications.toasts.addWarning({
      title: i18n.translate('labs.embeddingExplorer.installRequiredTitle', {
        defaultMessage: 'Install required',
      }),
      text: i18n.translate('labs.embeddingExplorer.installRequiredDescription', {
        defaultMessage: 'Install Embedding explorer from Labs before opening the app.',
      }),
    });
    await coreStart.application.navigateToApp('labs', { replace: true });
    return () => {};
  }

  coreStart.chrome.setBreadcrumbs([
    {
      text: i18n.translate('labs.breadcrumbsTitle', {
        defaultMessage: 'Labs',
      }),
      href: coreStart.application.getUrlForApp('labs'),
    },
    {
      text: i18n.translate('labs.embeddingExplorer.breadcrumbsTitle', {
        defaultMessage: 'Embedding explorer',
      }),
    },
  ]);

  ReactDOM.render(
    coreStart.rendering.addContext(
      <EmbeddingExplorerApp application={coreStart.application} http={coreStart.http} />
    ),
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
