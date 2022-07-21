/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { css } from '@emotion/css';
import { FiltersEditorContextType } from './filters_editor_context';
import { FilterGroup } from './filters_editor_filter_group';
import { getConditionalOperationType } from './filters_editor_utils';
import type { Path } from './filter_editors_types';

export interface FilterItemProps {
  path: Path;
  filter: Filter;
}

const filterItemCss = css`
  // temporary
  border: 1px solid;
`;

export function FilterItem({ filter, path }: FilterItemProps) {
  const conditionalOperationType = getConditionalOperationType(filter);
  const { dispatch } = useContext(FiltersEditorContextType);

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
              <code>
                query: {filter.meta.params.query} path: {path}
              </code>
              <EuiButton
                onClick={() => {
                  dispatch({ type: 'removeFilter', payload: { path } });
                }}
              >
                Test Action
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiFlexItem>
  );
}
