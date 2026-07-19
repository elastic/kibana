/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiLoadingElastic, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NoDataConfigPage } from '@kbn/shared-ux-page-no-data-config';
import { EsqlIllustration, NoDataViewsPrompt } from '@kbn/shared-ux-prompt-no-data-views';
import type { KibanaNoDataPageProps } from '@kbn/shared-ux-page-kibana-no-data-types';

import { useServices } from './services';

/**
 * A page to display when Kibana has no data, prompting a person to add integrations or create a new data view.
 */
export const KibanaNoDataPage = ({
  onDataViewCreated,
  noDataConfig,
  allowAdHocDataView,
  onTryESQL,
  onESQLNavigationComplete,
  showPlainSpinner,
}: KibanaNoDataPageProps) => {
  // These hooks are temporary, until this component is moved to a package.
  const services = useServices();
  const { hasESData, hasUserDataView } = services;

  const [isLoading, setIsLoading] = useState(true);
  const [dataExists, setDataExists] = useState(false);
  const [hasUserDataViews, setHasUserDataViews] = useState(false);

  useEffect(() => {
    const checkData = async () => {
      setDataExists(await hasESData());
      setHasUserDataViews(await hasUserDataView());
      setIsLoading(false);
    };
    checkData().catch((e) => {
      setIsLoading(false);
      // eslint-disable-next-line no-console
      console.error(e);
    });
  }, [hasESData, hasUserDataView]);

  const noDataConfigWithEsql = useMemo(() => {
    if (!onTryESQL || !noDataConfig) {
      return noDataConfig;
    }

    return {
      ...noDataConfig,
      action: {
        ...noDataConfig.action,
        esql: {
          title: i18n.translate('sharedUXPackages.kibanaNoDataPage.esqlCard.title', {
            defaultMessage: 'Query with ES|QL',
          }),
          description: i18n.translate('sharedUXPackages.kibanaNoDataPage.esqlCard.description', {
            defaultMessage:
              'Use ES|QL to query data from external sources without local integrations.',
          }),
          buttonText: i18n.translate('sharedUXPackages.kibanaNoDataPage.esqlCard.buttonLabel', {
            defaultMessage: 'Try ES|QL',
          }),
          icon: <EsqlIllustration />,
          onClick: onTryESQL,
          canAccessFleet: true,
          'data-test-subj': 'kbnNoDataPageTryEsql',
          docsLink: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html',
        },
      },
    };
  }, [noDataConfig, onTryESQL]);

  if (isLoading) {
    return showPlainSpinner ? (
      <EuiLoadingSpinner css={{ margin: 'auto' }} size="xxl" />
    ) : (
      <EuiLoadingElastic css={{ margin: 'auto' }} size="xxl" />
    );
  }

  if (!hasUserDataViews && dataExists) {
    return (
      <NoDataViewsPrompt
        onDataViewCreated={onDataViewCreated}
        allowAdHocDataView={allowAdHocDataView}
        onTryESQL={onTryESQL}
        onESQLNavigationComplete={onESQLNavigationComplete}
      />
    );
  }

  if (!dataExists) {
    return <NoDataConfigPage noDataConfig={noDataConfigWithEsql} />;
  }

  return null;
};
