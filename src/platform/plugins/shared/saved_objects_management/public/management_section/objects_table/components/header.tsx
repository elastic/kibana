/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

const savedObjectsTitle = i18n.translate(
  'savedObjectsManagement.objectsTable.header.savedObjectsTitle',
  { defaultMessage: 'Saved Objects' }
);

const savedObjectsDescription = i18n.translate(
  'savedObjectsManagement.objectsTable.howToDeleteSavedObjectsDescription',
  {
    defaultMessage:
      'Manage and share your saved objects. To edit the underlying data of an object, go to its associated application.',
  }
);

const importButtonLabel = i18n.translate(
  'savedObjectsManagement.objectsTable.header.importButtonLabel',
  { defaultMessage: 'Import' }
);

const refreshButtonLabel = i18n.translate(
  'savedObjectsManagement.objectsTable.header.refreshButtonLabel',
  { defaultMessage: 'Refresh' }
);

export const Header = ({
  onExportAll,
  onImport,
  onRefresh,
  filteredCount,
}: {
  onExportAll: () => void;
  onImport: () => void;
  onRefresh: () => void;
  filteredCount: number;
}) => {
  const menu: AppHeaderMenu = {
    primaryActionItem: {
      id: 'exportAll',
      label: i18n.translate('savedObjectsManagement.objectsTable.header.exportButtonLabel', {
        defaultMessage: 'Export {filteredCount, plural, one{# object} other {# objects}}',
        values: { filteredCount },
      }),
      iconType: 'upload',
      testId: 'exportAllObjects',
      run: onExportAll,
    },
    items: [
      {
        id: 'refresh',
        label: refreshButtonLabel,
        iconType: 'refresh',
        run: onRefresh,
      },
      {
        id: 'import',
        label: importButtonLabel,
        iconType: 'download',
        testId: 'importObjects',
        run: onImport,
      },
    ],
  };

  return (
    <AppHeader
      title={savedObjectsTitle}
      description={savedObjectsDescription}
      menu={menu}
      spacing="bleed"
    />
  );
};
