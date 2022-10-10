/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

interface ManagementLandingPageProps {
  version: string;
  onAppMounted: (id: string) => void;
  setBreadcrumbs: () => void;
}

export const ManagementLandingPage = ({
  version,
  setBreadcrumbs,
  onAppMounted,
}: ManagementLandingPageProps) => {
  setBreadcrumbs();

  useEffect(() => {
    onAppMounted('');
  }, [onAppMounted]);

  return (
    <KibanaPageTemplate.EmptyPrompt
      data-test-subj="managementHome"
      iconType="managementApp"
      title={
        <h1>
          <FormattedMessage
            id="management.landing.header"
            defaultMessage="Welcome to Stack Management {version}"
            values={{ version }}
          />
        </h1>
      }
      body={
        <>
          <p>
            <FormattedMessage
              id="management.landing.subhead"
              defaultMessage="Manage your indices, data views, saved objects, Kibana settings, and more."
            />
          </p>
          <EuiHorizontalRule />
          <p>
            <FormattedMessage
              id="management.landing.text"
              defaultMessage="A complete list of apps is in the menu on the left."
            />
          </p>
        </>
      }
    />
  );
};
