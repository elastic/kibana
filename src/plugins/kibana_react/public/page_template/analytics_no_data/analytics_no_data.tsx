/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { DocLinksStart, HttpStart } from 'src/core/public';
import { KibanaPageTemplate, KibanaPageTemplateProps } from '../';
import { useKibana } from '../../../../kibana_react/public';

export function AnalyticsNoData() {
  const { services } = useKibana<{ docLinks: DocLinksStart; http: HttpStart }>();

  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] = {
    solution: i18n.translate('kibanaOverview.noDataConfig.solutionName', {
      defaultMessage: `Analytics`,
    }),
    logo: 'logoKibana',
    actions: {
      beats: {
        href: services.http.basePath.prepend(`home#/tutorial_directory`),
      },
    },
    docsLink: services.docLinks.links.kibana,
  };

  return <KibanaPageTemplate noDataConfig={noDataConfig} template="empty" />;
}
