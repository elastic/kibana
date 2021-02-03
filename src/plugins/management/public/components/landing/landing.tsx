/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiHorizontalRule,
  EuiIcon,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface ManagementLandingPageProps {
  version: string;
  setBreadcrumbs: () => void;
}

export const ManagementLandingPage = ({ version, setBreadcrumbs }: ManagementLandingPageProps) => {
  setBreadcrumbs();

  return (
    <EuiPageContent horizontalPosition="center" data-test-subj="managementHome">
      <div>
        <div className="eui-textCenter">
          <EuiIcon type="managementApp" size="xxl" />
          <EuiSpacer />
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="management.landing.header"
                defaultMessage="Welcome to Stack Management {version}"
                values={{ version }}
              />
            </h1>
          </EuiTitle>
          <EuiText>
            <FormattedMessage
              id="management.landing.subhead"
              defaultMessage="Manage your indices, index patterns, saved objects, Kibana settings, and more."
            />
          </EuiText>
        </div>

        <EuiHorizontalRule />

        <EuiText color="subdued" size="s" textAlign="center">
          <p>
            <FormattedMessage
              id="management.landing.text"
              defaultMessage="A complete list of apps is in the menu on the left."
            />
          </p>
        </EuiText>
      </div>
    </EuiPageContent>
  );
};
