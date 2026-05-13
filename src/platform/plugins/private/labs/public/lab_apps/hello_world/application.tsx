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
import { HELLO_WORLD_LAB_ID } from '../../../common';
import { HelloWorldApp } from './components/hello_world_app';

interface RenderHelloWorldAppArgs {
  coreStart: CoreStart;
  installedLabsService: InstalledLabsService;
  params: AppMountParameters;
}

export const renderApp = async ({
  coreStart,
  installedLabsService,
  params,
}: RenderHelloWorldAppArgs): Promise<LabUnmount> => {
  const isInstalled = await installedLabsService.isInstalled(HELLO_WORLD_LAB_ID);

  if (!isInstalled) {
    coreStart.notifications.toasts.addWarning({
      title: i18n.translate('labs.helloWorld.installRequiredTitle', {
        defaultMessage: 'Install required',
      }),
      text: i18n.translate('labs.helloWorld.installRequiredDescription', {
        defaultMessage: 'Install Hello world from Labs before opening the app.',
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
      text: i18n.translate('labs.helloWorld.breadcrumbsTitle', {
        defaultMessage: 'Hello world',
      }),
    },
  ]);

  ReactDOM.render(
    coreStart.rendering.addContext(
      <HelloWorldApp application={coreStart.application} http={coreStart.http} />
    ),
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
