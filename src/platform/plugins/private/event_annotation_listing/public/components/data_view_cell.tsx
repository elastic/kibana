/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ContentListItem } from '@kbn/content-list';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';

export interface DataViewCellProps {
  /**
   * Annotation-group list item. `ContentListClientProvider` spreads
   * `attributes` to the top of each `ContentListItem`, so `indexPatternId` /
   * `dataViewSpec` arrive flat rather than nested under `attributes`.
   */
  item: ContentListItem<{ indexPatternId?: string; dataViewSpec?: DataViewSpec }>;
  /**
   * Lookup of `dataViewId` → display name for the data views available to
   * the listing. Built once by the page from the data views start contract.
   */
  dataViewNameMap: Record<string, string>;
}

/**
 * Renders the "Data view" column for an annotation-group row.
 *
 * Resolution order:
 *  1. If the group carries an ad-hoc `dataViewSpec`, use its name verbatim.
 *  2. Otherwise look up `indexPatternId` in `dataViewNameMap`.
 *  3. If neither resolves, render a danger-styled "No longer exists" marker.
 */
export const DataViewCell = ({ item, dataViewNameMap }: DataViewCellProps) => {
  const { dataViewSpec, indexPatternId } = item;

  if (dataViewSpec) {
    return <div>{dataViewSpec.name}</div>;
  }

  const name = indexPatternId ? dataViewNameMap[indexPatternId] : undefined;
  if (name) {
    return <div>{name}</div>;
  }

  return (
    <EuiText size="s" color="danger">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="error" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="eventAnnotationListing.dataViewCell.missing"
            defaultMessage="No longer exists"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};
