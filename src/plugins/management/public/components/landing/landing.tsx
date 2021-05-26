/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiHorizontalRule } from '@elastic/eui';
import { KibanaPageTemplateProps } from '../../../../../../src/plugins/kibana_react/public';

interface ManagementLandingPageProps {
  version: string;
  setBreadcrumbs: () => void;
  managementPageLayout: ComponentType<KibanaPageTemplateProps>;
}

export const ManagementLandingPage = ({
  version,
  setBreadcrumbs,
  managementPageLayout: ManagementPageLayout,
}: ManagementLandingPageProps) => {
  setBreadcrumbs();

  return (
    <ManagementPageLayout
      data-test-subj="managementHome"
      isEmptyState
      template="centeredContent"
      pageHeader={{
        iconType: 'managementApp',
        pageTitle: (
          <FormattedMessage
            id="management.landing.header"
            defaultMessage="Welcome to Stack Management {version}"
            values={{ version }}
          />
        ),
        description: (
          <>
            <FormattedMessage
              id="management.landing.subhead"
              defaultMessage="Manage your indices, index patterns, saved objects, Kibana settings, and more."
            />
            <EuiHorizontalRule />
            <FormattedMessage
              id="management.landing.text"
              defaultMessage="A complete list of apps is in the menu on the left."
            />
          </>
        ),
      }}
    />
  );
};
