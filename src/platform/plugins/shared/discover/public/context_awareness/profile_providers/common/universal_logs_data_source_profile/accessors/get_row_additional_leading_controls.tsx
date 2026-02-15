/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RowControlRowProps } from '@kbn/discover-utils';
import { createDegradedDocsControl, createStacktraceControl } from '@kbn/discover-utils';
import { retrieveMetadataColumns } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { BasicPrettyPrinter, mutate, parse } from '@kbn/esql-language';
import { IGNORED_FIELD } from '@kbn/discover-utils/src/field_constants';
import type { DataSourceProfileProvider } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';

/**
 * Provides additional row controls for logs
 * Capability-aware: Controls only added if backing services exist (APM, Streams)
 * 
 * - Degraded docs control: Shows quality issues (requires metadata access)
 * - Stacktrace control: Opens doc viewer to stacktrace section
 */
export const createGetRowAdditionalLeadingControls = (services: ProfileProviderServices) => {
  const getRowAdditionalLeadingControls: DataSourceProfileProvider['profile']['getRowAdditionalLeadingControls'] =
    (prev) => (params) => {
      const additionalControls = prev(params) || [];

      // Check if we have the necessary capabilities
      const hasStreams = services.core?.application?.applications$?.value?.has('streams') ?? false;
      const hasApm = services.core?.application?.applications$?.value?.has('apm') ?? false;

      // Only add controls if we have backing services
      if (!hasStreams && !hasApm) {
        return additionalControls;
      }

      const {
        actions: { updateESQLQuery, setExpandedDoc },
        query,
      } = params;

      const isDegradedDocsControlEnabled = isOfAggregateQueryType(query)
        ? queryContainsMetadataIgnored(query)
        : true;

      const addIgnoredMetadataToQuery = updateESQLQuery
        ? () => {
            updateESQLQuery((prevQuery) => {
              const { root } = parse(prevQuery);
              // Add _ignored field to metadata directive if not present
              mutate.commands.from.metadata.upsert(root, IGNORED_FIELD);

              return BasicPrettyPrinter.print(root);
            });
          }
        : undefined;

      const leadingControlClick =
        (
          openDocViewer: NonNullable<typeof setExpandedDoc>,
          actionName: 'stacktrace' | 'quality_issues'
        ) =>
        (props: RowControlRowProps) => {
          // Open the doc viewer - it will show the universal logs overview
          openDocViewer(props.record, { initialTabId: 'doc_view_logs_overview' });
        };

      return setExpandedDoc
        ? [
            ...additionalControls,
            createDegradedDocsControl({
              enabled: isDegradedDocsControlEnabled,
              addIgnoredMetadataToQuery,
              onClick: leadingControlClick(setExpandedDoc, 'quality_issues'),
            }),
            createStacktraceControl({ onClick: leadingControlClick(setExpandedDoc, 'stacktrace') }),
          ]
        : additionalControls;
    };

  return getRowAdditionalLeadingControls;
};

const queryContainsMetadataIgnored = (query: AggregateQuery) =>
  retrieveMetadataColumns(query.esql).includes('_ignored');
