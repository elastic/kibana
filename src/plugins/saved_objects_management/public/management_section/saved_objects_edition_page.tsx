/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { CoreStart, ChromeBreadcrumb, ScopedHistory } from 'src/core/public';
import { RedirectAppLinks } from '../../../kibana_react/public';
import { SavedObjectEdition } from './object_view';
import './saved_objects_edition_page.scss';

const SavedObjectsEditionPage = ({
  coreStart,
  setBreadcrumbs,
  history,
}: {
  coreStart: CoreStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  history: ScopedHistory;
}) => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const capabilities = coreStart.application.capabilities;
  const docLinks = coreStart.docLinks.links;

  const { search } = useLocation();
  const query = parse(search);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.index', {
          defaultMessage: 'Saved objects',
        }),
        href: '/',
      },
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.inspect', {
          defaultMessage: 'Inspect {savedObjectType}',
          values: { savedObjectType: type },
        }),
      },
    ]);
  }, [setBreadcrumbs, type]);

  return (
    <RedirectAppLinks
      application={coreStart.application}
      className="savedObjectsManagementEditionPage"
    >
      <SavedObjectEdition
        id={id}
        savedObjectType={type}
        http={coreStart.http}
        savedObjectsClient={coreStart.savedObjects.client}
        overlays={coreStart.overlays}
        notifications={coreStart.notifications}
        capabilities={capabilities}
        notFoundType={query.notFound as string}
        uiSettings={coreStart.uiSettings}
        history={history}
        docLinks={docLinks}
      />
    </RedirectAppLinks>
  );
};

// eslint-disable-next-line import/no-default-export
export { SavedObjectsEditionPage as default };
