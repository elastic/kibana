/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { type FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';
import { type CoreStart } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

interface Props {
  kibanaVersion: string;
  coreStart: CoreStart;
}

const RulesLink: FC<{ coreStart: CoreStart }> = ({ coreStart }) => (
  <EuiLink
    href={coreStart.application.getUrlForApp('management', {
      path: 'insightsAndAlerting/triggersActions',
    })}
    data-test-subj="managementLinkToRules"
  >
    {i18n.translate('management.landing.subhead.rulesLink', {
      defaultMessage: 'rules',
    })}
  </EuiLink>
);

const SavedObjectsLink: FC<{ coreStart: CoreStart }> = ({ coreStart }) => (
  <EuiLink
    href={coreStart.application.getUrlForApp('management', { path: 'kibana/objects' })}
    data-test-subj="managementLinkToSavedObjects"
  >
    {i18n.translate('management.landing.subhead.savedObjectsLink', {
      defaultMessage: 'saved objects',
    })}
  </EuiLink>
);

const UsersLink: FC<{ coreStart: CoreStart }> = ({ coreStart }) => (
  <EuiLink
    href={coreStart.application.getUrlForApp('management', { path: 'security/users' })}
    data-test-subj="managementLinkToUsers"
  >
    {i18n.translate('management.landing.subhead.usersLink', {
      defaultMessage: 'users',
    })}
  </EuiLink>
);

export const SolutionEmptyPrompt: FC<Props> = ({ kibanaVersion, coreStart }) => {
  return (
    <KibanaPageTemplate.EmptyPrompt
      data-test-subj="managementHomeSolution"
      iconType="managementApp"
      title={
        <h1>
          <FormattedMessage
            id="management.landing.solution.header"
            defaultMessage="Stack Management {version}"
            values={{ version: kibanaVersion }}
          />
        </h1>
      }
      body={
        <>
          <p>
            <FormattedMessage
              id="management.landing.solution.subhead"
              defaultMessage="Manage your {rulesLink}, {usersLink}, {savedObjectsLink} and more."
              values={{
                rulesLink: <RulesLink coreStart={coreStart} />,
                usersLink: <UsersLink coreStart={coreStart} />,
                savedObjectsLink: <SavedObjectsLink coreStart={coreStart} />,
              }}
            />
          </p>

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
