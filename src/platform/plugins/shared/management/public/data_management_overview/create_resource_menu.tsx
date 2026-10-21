/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { CoreStart } from '@kbn/core/public';
import type { DataManagementCreateOverlayId } from '../types';

const createResourceLabel = i18n.translate('management.dataManagementOverview.create.button', {
  defaultMessage: 'Create resource',
});

/** Header menu that opens each resource create UI on the overview page. */
export const getCreateResourceMenu = ({
  getUrlForApp,
  onOpenCreate,
}: {
  getUrlForApp: CoreStart['application']['getUrlForApp'];
  onOpenCreate: (id: DataManagementCreateOverlayId) => void;
}): AppHeaderMenu => ({
  primaryActionItem: {
    id: 'createResource',
    iconType: 'plus',
    label: createResourceLabel,
    testId: 'dataManagementOverviewCreateButton',
    popoverTestId: 'dataManagementOverviewCreateMenu',
    popoverWidth: 420,
    items: [
      {
        id: 'createIndex',
        order: 1,
        label: i18n.translate('management.dataManagementOverview.create.index', {
          defaultMessage: 'Index',
        }),
        description: i18n.translate('management.dataManagementOverview.create.indexDescription', {
          defaultMessage: 'An index stores and defines the schema of your data.',
        }),
        run: () => onOpenCreate('index'),
        separator: 'below',
        testId: 'dataManagementOverviewCreateIndex',
      },
      {
        id: 'createDataStream',
        order: 2,
        label: i18n.translate('management.dataManagementOverview.create.dataStream', {
          defaultMessage: 'Data stream',
        }),
        description: i18n.translate(
          'management.dataManagementOverview.create.dataStreamDescription',
          {
            defaultMessage: 'Create a classic stream from an index template.',
          }
        ),
        run: () => onOpenCreate('dataStream'),
        separator: 'below',
        testId: 'dataManagementOverviewCreateDataStream',
      },
      {
        id: 'createEsqlView',
        order: 3,
        label: i18n.translate('management.dataManagementOverview.create.esqlView', {
          defaultMessage: 'ES|QL View',
        }),
        description: i18n.translate(
          'management.dataManagementOverview.create.esqlViewDescription',
          {
            defaultMessage: 'Define a named, reusable query and reference it like an index.',
          }
        ),
        run: () => onOpenCreate('esqlView'),
        separator: 'below',
        testId: 'dataManagementOverviewCreateEsqlView',
      },
      {
        id: 'createDataset',
        order: 4,
        label: i18n.translate('management.dataManagementOverview.create.dataset', {
          defaultMessage: 'External dataset',
        }),
        description: i18n.translate('management.dataManagementOverview.create.datasetDescription', {
          defaultMessage: 'Query external data with ES|QL, without ingesting it.',
        }),
        href: getUrlForApp('management', {
          path: '/data/data_federation/datasets/create',
        }),
        testId: 'dataManagementOverviewCreateDataset',
      },
    ],
  },
});
