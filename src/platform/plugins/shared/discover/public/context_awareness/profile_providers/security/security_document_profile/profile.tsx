/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldValue } from '@kbn/discover-utils';
import { DocumentProfileProvider, DocumentType, SolutionType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { SecurityProfileProviderFactory } from '../types';
import { SECURITY_PROFILE_ID } from '../constants';
import { AlertEventOverview } from '../accessors/alert_event_overview';
import * as i18n from '../translations';

export const createSecurityDocumentProfileProvider: SecurityProfileProviderFactory<
  DocumentProfileProvider
> = (services: ProfileProviderServices) => {
  return {
    profileId: SECURITY_PROFILE_ID.document,
    experimental: true,
    profile: {
      getDocViewer: (prev) => (params) => {
        const prevDocViewer = prev(params);
        const isAlert = getFieldValue(params.record, 'event.kind') === 'signal';

        return {
          ...prevDocViewer,
          docViewsRegistry: (registry) => {
            registry.add({
              id: 'doc_view_alerts_overview',
              title: i18n.overviewTabTitle(isAlert),
              order: 0,
              component: AlertEventOverview,
            });

            return prevDocViewer.docViewsRegistry(registry);
          },
        };
      },
    },
    resolve: ({ rootContext }) => {
      if (rootContext.solutionType !== SolutionType.Security) {
        return { isMatch: false };
      }

      return {
        isMatch: true,
        context: {
          type: DocumentType.Default,
        },
      };
    },
  };
};
