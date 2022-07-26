/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { css } from '@emotion/react';

export interface FiltersNotificationProps {
  displayName: string;
  id: string;
  filters: Filter[];
  dataViewList: DataView[];
}

export function FiltersNotificationModal({
  displayName,
  id,
  filters,
  dataViewList,
}: FiltersNotificationProps) {
  return (
    <>
      <EuiModalHeader id="filtersNotificationModal__header">
        <EuiModalHeaderTitle>
          <h2 id={`title-${id}`}>{displayName}</h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody id="filtersNotificationModal__body">
        <EuiFlexGroup
          wrap={true}
          gutterSize="xs"
          // the following makes it so that the filter pills respect the inner padding of the modal body
          // regardless of what the gutter size is
          css={css`
            max-width: 100%;
          `}
        >
          <FilterItems filters={filters} indexPatterns={dataViewList} readOnly={true} />
        </EuiFlexGroup>
      </EuiModalBody>
    </>
  );
}
