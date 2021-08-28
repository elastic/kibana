/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { parse } from 'query-string';
import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { CoreStart } from '../../../../core/public/types';
import { ScopedHistory } from '../../../../core/public/application/scoped_history';
import type { ChromeBreadcrumb } from '../../../../core/public/chrome/types';
import { RedirectAppLinks } from '../../../kibana_react/public/app_links/redirect_app_link';
import type { ISavedObjectsManagementServiceRegistry } from '../services/service_registry';
import { SavedObjectEdition } from './object_view/saved_object_view';

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
    <RedirectAppLinks application={coreStart.application}>
      <SavedObjectEdition
        id={id}
        http={coreStart.http}
        serviceName={serviceName}
        serviceRegistry={serviceRegistry}
        savedObjectsClient={coreStart.savedObjects.client}
        overlays={coreStart.overlays}
        notifications={coreStart.notifications}
        capabilities={capabilities}
        notFoundType={query.notFound as string}
        history={history}
      />
    </RedirectAppLinks>
  );
};

// eslint-disable-next-line import/no-default-export
export { SavedObjectsEditionPage as default };
