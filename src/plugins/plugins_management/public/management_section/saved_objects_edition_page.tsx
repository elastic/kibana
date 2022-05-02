/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CoreStart, ChromeBreadcrumb, ScopedHistory } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/kibana-react-plugin/public';
import { EuiDescriptionList, EuiTitle, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import './saved_objects_edition_page.scss';
import { Inspect } from './object_view/components/inspect'
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const SavedObjectsEditionPage = ({
  coreStart,
  setBreadcrumbs,
  history,
}: {
  coreStart: CoreStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  history: ScopedHistory;
}) => {
  const { id: pluginName } = useParams<{ id: string }>();
  const { uiSettings } = coreStart;
  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.index', {
          defaultMessage: 'Plugins Management',
        }),
        href: '/',
      },
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.inspect', {
          defaultMessage: 'Inspect {pluginName}',
          values: { pluginName },
        }),
      },
    ]);
  }, [setBreadcrumbs, pluginName]);

  return (
    <KibanaContextProvider services={{ uiSettings }}>
      <RedirectAppLinks
        application={coreStart.application}
        className="savedObjectsManagementEditionPage"
      >
        <EuiTitle><h1>{pluginName} Plugin</h1></EuiTitle>
        <EuiSpacer size='m' />
        <p>Console plugin enables Kibana users to interact with Elasticsearch and Kibana through APIs with some neat autocomplete features, profiler, and other tools.</p>
        <EuiSpacer />
        
        <EuiTitle><h2>{pluginName} Changelog</h2></EuiTitle>
        <EuiHorizontalRule />
        <Inspect
          object={{
            "id": "console",
            "version": "8.3.0",
            "source": "Elastic Verified",
            'configs': {
              'console.autoUpgrade': true,
              'console.enabled': true,
            },
            'meta': { title: 'Console Kibana.yml configs'},
          }}
        />
        <EuiTitle><h2>{pluginName} Changelog</h2></EuiTitle>
        <EuiHorizontalRule />
        <EuiDescriptionList
          listItems={[
            {
              title: '8.3.1',
              description: 'Bug fix - red background color',
            },
            {
              title: '8.3.0',
              description: 'You can now use the Console to call Kibana APIs! Read the blog post for more info',
            },
          ]}
        />
      </RedirectAppLinks>
    </KibanaContextProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { SavedObjectsEditionPage as default };
