/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { NoResultsSuggestions } from './no_results_suggestions';
import './_no_results.scss';

export interface DiscoverNoResultsProps {
  isTimeBased?: boolean;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  error?: Error;
  data: DataPublicPluginStart;
  dataView: DataView;
  onDisableFilters: () => void;
}

export function DiscoverNoResults({
  isTimeBased,
  query,
  filters,
  error,
  data,
  dataView,
  onDisableFilters,
}: DiscoverNoResultsProps) {
  const callOut = !error ? (
    <EuiFlexItem grow={false}>
      <NoResultsSuggestions
        isTimeBased={isTimeBased}
        query={query}
        filters={filters}
        dataView={dataView}
        onDisableFilters={onDisableFilters}
      />
    </EuiFlexItem>
  ) : (
    <EuiFlexItem grow={true} className="dscNoResults">
      <EuiCallOut
        title={
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsBecauseOfError"
            defaultMessage="We encountered an error retrieving search results"
          />
        }
        color="danger"
        iconType="alert"
        data-test-subj="discoverNoResultsError"
      >
        <EuiButton
          size="s"
          color="danger"
          onClick={() => (data ? data.search.showError(error) : void 0)}
        >
          <FormattedMessage
            id="discover.showErrorMessageAgain"
            defaultMessage="Show error message"
          />
        </EuiButton>
      </EuiCallOut>
    </EuiFlexItem>
  );

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="center">{callOut}</EuiFlexGroup>
    </Fragment>
  );
}
