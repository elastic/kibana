/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

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
  <Fragment>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h1>
            <FormattedMessage
              id="savedObjectsManagement.objectsTable.header.savedObjectsTitle"
              defaultMessage="Saved Objects"
            />
          </h1>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
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
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
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
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" iconType="refresh" onClick={onRefresh}>
              <FormattedMessage
                id="savedObjectsManagement.objectsTable.header.refreshButtonLabel"
                defaultMessage="Refresh"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <EuiText size="s">
      <p>
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="savedObjectsManagement.objectsTable.howToDeleteSavedObjectsDescription"
            defaultMessage="Manage and share your saved objects. To edit the underlying data of an object, go to its associated application."
          />
        </EuiTextColor>
      </p>
    </EuiText>
    <EuiSpacer size="m" />
  </Fragment>
);
