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
import { EuiButton, EuiLink } from '@elastic/eui';
import { type CoreStart } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

interface Props {
  kibanaVersion: string;
  coreStart: CoreStart;
}

const IndicesLink: FC<{ coreStart: CoreStart }> = ({ coreStart }) => (
  <EuiLink
    href={coreStart.application.getUrlForApp('management', { path: 'data/index_management' })}
    data-test-subj="managementLinkToIndices"
  >
    {i18n.translate('management.landing.subhead.indicesLink', {
      defaultMessage: 'indices',
    })}
  </EuiLink>
);

const DataViewsLink: FC<{ coreStart: CoreStart }> = ({ coreStart }) => (
  <EuiLink
    href={coreStart.application.getUrlForApp('management', { path: 'kibana/dataViews' })}
    data-test-subj="managementLinkToDataViews"
  >
    {i18n.translate('management.landing.subhead.dataViewsLink', {
      defaultMessage: 'data views',
    })}
  </EuiLink>
);

const IngestPipelinesLink: FC<{ coreStart: CoreStart }> = ({ coreStart }) => (
  <EuiLink
    href={coreStart.application.getUrlForApp('management', { path: 'ingest/ingest_pipelines' })}
    data-test-subj="managementLinkToIngestPipelines"
  >
    {i18n.translate('management.landing.subhead.ingestPipelinesLink', {
      defaultMessage: 'ingest pipelines',
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
              defaultMessage="Manage your {indicesLink}, {dataViewsLink}, {ingestPipelinesLink}, {usersLink}, and more."
              values={{
                indicesLink: <IndicesLink coreStart={coreStart} />,
                dataViewsLink: <DataViewsLink coreStart={coreStart} />,
                ingestPipelinesLink: <IngestPipelinesLink coreStart={coreStart} />,
                usersLink: <UsersLink coreStart={coreStart} />,
              }}
            />
          </p>

          <p>
            <EuiButton
              fill
              iconType="spaces"
              onClick={() => {
                coreStart.chrome.sideNav.setPanelSelectedNode('stack_management');
              }}
              data-test-subj="viewAllStackMngtPagesButton"
            >
              <FormattedMessage
                id="management.landing.solution.viewAllPagesButton"
                defaultMessage="View all pages"
              />
            </EuiButton>
          </p>
        </>
      }
    />
  );
};
