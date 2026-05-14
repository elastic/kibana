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
import type { InstalledLabsService } from './services/installed_labs_service';
import type { LabDefinition } from './types';
import { LabsApp } from './components/labs_app';

interface RenderLabsAppArgs {
  coreStart: CoreStart;
  installedLabsService: InstalledLabsService;
  labs: readonly LabDefinition[];
  params: AppMountParameters;
}

export const renderApp = ({ coreStart, installedLabsService, labs, params }: RenderLabsAppArgs) => {
  coreStart.chrome.setBreadcrumbs([
    {
      text: i18n.translate('labs.breadcrumbsTitle', {
        defaultMessage: 'Labs',
      }),
    },
  ]);

  ReactDOM.render(
    coreStart.rendering.addContext(
      <LabsApp
        application={coreStart.application}
        installedLabsService={installedLabsService}
        labs={labs}
      />
    ),
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
