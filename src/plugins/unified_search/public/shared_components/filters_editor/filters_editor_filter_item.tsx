/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { css } from '@emotion/css';
import { FilterGroup } from './filters_editor_filter_group';
import { getConditionalOperationType } from './filters_editor_utils';
import type { Path } from './filter_editors_types';

export interface FilterItemProps {
  path: Path;
  filter: Filter;
}

const filterItemCss = css`
  border: 1px solid;
`;

export function FilterItem({ filter, path }: FilterItemProps) {
  const conditionalOperationType = getConditionalOperationType(filter);

  return (
    <EuiFlexItem className={filterItemCss}>
      {conditionalOperationType ? (
        <FilterGroup
          path={path}
          conditionType={conditionalOperationType}
          filters={filter.meta?.params?.filters}
        />
      ) : (
        <>
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <p>{JSON.stringify(filter)}</p>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiFlexItem>
  );
}
