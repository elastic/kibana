/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { DocumentProfileProvider } from '../../../profiles';
import { DocumentType } from '../../../profiles';
import type { DocViewerExtensionParams } from '../../../types';
import {
  CHANGE_POINT_DATA_SOURCE_PROFILE_ID,
  isChangePointDataSourceContext,
  type ChangePointLensDocContext,
} from '../change_point_data_source_profile/change_point_context';
import { ChangePointTab } from './change_point_tab';

export interface ChangePointDocumentProfileContext {
  changePointLensContext$: BehaviorSubject<ChangePointLensDocContext | undefined>;
}

export const createChangePointDocumentProfileProvider =
  (): DocumentProfileProvider<ChangePointDocumentProfileContext> => ({
    profileId: 'change-point-document-profile',
    profile: {
      getDocViewer:
        (prev, { context }) =>
        (params: DocViewerExtensionParams) => {
          const prevDocViewer = prev(params);
          return {
            ...prevDocViewer,
            docViewsRegistry: (registry: DocViewsRegistry) => {
              registry.add({
                id: 'doc_view_change_point_details',
                title: i18n.translate('discover.contextAwareness.changePointDocView.tabTitle', {
                  defaultMessage: 'Change point',
                }),
                order: 5,
                render: (props) => (
                  <ChangePointTab
                    docViewActions={params.actions}
                    changePointLensContext$={context.changePointLensContext$}
                    {...props}
                  />
                ),
              });
              return prevDocViewer.docViewsRegistry(registry);
            },
          };
        },
    },
    resolve: ({ dataSourceContext }) => {
      if (dataSourceContext.profileId !== CHANGE_POINT_DATA_SOURCE_PROFILE_ID) {
        return { isMatch: false };
      }
      return {
        isMatch: true,
        context: {
          type: DocumentType.Default,
          changePointLensContext$: isChangePointDataSourceContext(dataSourceContext)
            ? dataSourceContext.changePointLensContext$
            : new BehaviorSubject<ChangePointLensDocContext | undefined>(undefined),
        },
      };
    },
  });
