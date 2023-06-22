/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { distinctUntilChanged } from 'rxjs';

import { css } from '@emotion/react';
import { EuiPanel, EuiTitle, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { compareFilters, COMPARE_ALL_OPTIONS, type Filter, type Query } from '@kbn/es-query';

import { FilterDebuggerEmbeddable } from './filter_debugger_embeddable';

interface Props {
  embeddable: FilterDebuggerEmbeddable;
}

export function FilterDebuggerEmbeddableComponent({ embeddable }: Props) {
  const [filters, setFilters] = useState<Filter[]>();
  const [query, setQuery] = useState<Query>();

  useEffect(() => {
    const subscription = embeddable
      .getInput$()
      .pipe(
        distinctUntilChanged(
          ({ filters: filtersA, query: queryA }, { filters: filtersB, query: queryB }) => {
            return (
              JSON.stringify(queryA) === JSON.stringify(queryB) &&
              compareFilters(filtersA ?? [], filtersB ?? [], COMPARE_ALL_OPTIONS)
            );
          }
        )
      )
      .subscribe(({ filters: newFilters, query: newQuery }) => {
        setFilters(newFilters);
        setQuery(newQuery);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [embeddable]);

  return (
    <EuiPanel
      css={css`
        width: 100% !important;
        height: 100% !important;
      `}
      className="eui-yScrollWithShadows"
      hasShadow={false}
    >
      <EuiTitle>
        <h2>Filters</h2>
      </EuiTitle>
      <EuiCodeBlock language="JSON">{JSON.stringify(filters, undefined, 1)}</EuiCodeBlock>
      <EuiSpacer size="l" />
      <EuiTitle>
        <h2>Query</h2>
      </EuiTitle>
      <EuiCodeBlock language="JSON">{JSON.stringify(query, undefined, 1)}</EuiCodeBlock>
    </EuiPanel>
  );
}
