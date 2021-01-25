/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { CoreStart, ChromeBreadcrumb, ScopedHistory } from 'src/core/public';
import { ISavedObjectsManagementServiceRegistry } from '../services';
import { SavedObjectEdition } from './object_view';

const SavedObjectsEditionPage = ({
  coreStart,
  serviceRegistry,
  setBreadcrumbs,
  history,
}: {
  coreStart: CoreStart;
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  history: ScopedHistory;
}) => {
  const { service: serviceName, id } = useParams<{ service: string; id: string }>();
  const capabilities = coreStart.application.capabilities;

  const { search } = useLocation();
  const query = parse(search);
  const service = serviceRegistry.get(serviceName);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.index', {
          defaultMessage: 'Saved objects',
        }),
        href: '/',
      },
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.edit', {
          defaultMessage: 'Edit {savedObjectType}',
          values: { savedObjectType: service?.service.type ?? 'object' },
        }),
      },
    ]);
  }, [setBreadcrumbs, service]);

  return (
    <SavedObjectEdition
      id={id}
      serviceName={serviceName}
      serviceRegistry={serviceRegistry}
      savedObjectsClient={coreStart.savedObjects.client}
      overlays={coreStart.overlays}
      notifications={coreStart.notifications}
      capabilities={capabilities}
      notFoundType={query.notFound as string}
      history={history}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { SavedObjectsEditionPage as default };
