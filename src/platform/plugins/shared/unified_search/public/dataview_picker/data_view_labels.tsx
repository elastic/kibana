/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';

const TEMPORARY_LABEL = i18n.translate(
  'unifiedSearch.query.queryBar.indexPattern.temporaryDataviewLabel',
  {
    defaultMessage: 'Temporary',
  }
);
const MANAGED_LABEL = i18n.translate(
  'unifiedSearch.query.queryBar.indexPattern.managedDataviewLabel',
  {
    defaultMessage: 'Managed',
  }
);

const TemporaryDataViewLabel = memo(({ name }: { name: string | undefined }) => {
  return (
    <EuiBadge color="hollow" data-test-subj={`dataViewItemTempBadge-${name}`}>
      {TEMPORARY_LABEL}
    </EuiBadge>
  );
});

const ManagedDataViewLabel = memo(({ name }: { name: string | undefined }) => {
  return (
    <EuiBadge color="hollow" data-test-subj={`dataViewItemManagedBadge-${name}`}>
      {MANAGED_LABEL}
    </EuiBadge>
  );
});

export interface DataViewLabelsProps {
  /**
   * True if the data view is temporary (ad-hoc)
   */
  isAdhoc: boolean | undefined;
  /**
   * True if the data view is managed
   */
  isManaged: boolean | undefined;
  /**
   * Name of the data view
   */
  name: string | undefined;
}

/**
 * Renders labels for the data view item, depending on if the data view is managed, adhoc, both or neither.
 * These are used within the data view picker dropdown as well as the data view picker button.
 */
export const DataViewLabels = memo(({ isAdhoc, isManaged, name }: DataViewLabelsProps) => {
  return (
    <>
      {isManaged && isAdhoc ? (
        <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <TemporaryDataViewLabel name={name} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ManagedDataViewLabel name={name} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : isManaged ? (
        <ManagedDataViewLabel name={name} />
      ) : isAdhoc ? (
        <TemporaryDataViewLabel name={name} />
      ) : null}
    </>
  );
});

DataViewLabels.displayName = 'DataViewLabels';
