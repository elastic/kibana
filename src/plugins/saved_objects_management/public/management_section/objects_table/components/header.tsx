/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonEmpty, EuiPageHeader } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

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
}) => (
  <EuiPageHeader
    pageTitle={
      <FormattedMessage
        id="savedObjectsManagement.objectsTable.header.savedObjectsTitle"
        defaultMessage="Saved Objects"
      />
    }
    description={
      <FormattedMessage
        id="savedObjectsManagement.objectsTable.howToDeleteSavedObjectsDescription"
        defaultMessage="Manage and share your saved objects. To edit the underlying data of an object, go to its associated application."
      />
    }
    bottomBorder
    rightSideItems={[
      <EuiButtonEmpty
        size="s"
        iconType="exportAction"
        data-test-subj="exportAllObjects"
        onClick={onExportAll}
      >
        <FormattedMessage
          id="savedObjectsManagement.objectsTable.header.exportButtonLabel"
          defaultMessage="Export {filteredCount, plural, one{# object} other {# objects}}"
          values={{
            filteredCount,
          }}
        />
      </EuiButtonEmpty>,
      <EuiButtonEmpty
        size="s"
        iconType="importAction"
        data-test-subj="importObjects"
        onClick={onImport}
      >
        <FormattedMessage
          id="savedObjectsManagement.objectsTable.header.importButtonLabel"
          defaultMessage="Import"
        />
      </EuiButtonEmpty>,
      <EuiButtonEmpty size="s" iconType="refresh" onClick={onRefresh}>
        <FormattedMessage
          id="savedObjectsManagement.objectsTable.header.refreshButtonLabel"
          defaultMessage="Refresh"
        />
      </EuiButtonEmpty>,
    ]}
  />
);
