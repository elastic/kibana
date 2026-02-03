/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldValue } from '@kbn/discover-utils';
import React from 'react';
import type { DocumentProfileProvider } from '../../../profiles';
import { DocumentType, SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { SECURITY_PROFILE_ID } from '../constants';
import * as i18n from '../translations';
import type { SecurityProfileProviderFactory } from '../types';
import { AlertEventOverviewLazy } from '../components';

export const createSecurityDocumentProfileProvider: SecurityProfileProviderFactory<
  DocumentProfileProvider
> = (_services: ProfileProviderServices) => {
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
              render: (props) => <AlertEventOverviewLazy {...props} />,
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
