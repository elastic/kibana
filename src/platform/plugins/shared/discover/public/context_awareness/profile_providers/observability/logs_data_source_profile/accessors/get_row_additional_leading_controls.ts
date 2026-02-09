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
import type { LogsDataSourceProfileProvider } from '../profile';
import type { RowControlsExtensionParams } from '../../../../types';

export const getRowAdditionalLeadingControls: LogsDataSourceProfileProvider['profile']['getRowAdditionalLeadingControls'] =

    (prev, { context }) =>
    (params) => {
      const additionalControls = prev(params) || [];
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
          openDocViewer: NonNullable<RowControlsExtensionParams['actions']['setExpandedDoc']>,
          actionName: 'stacktrace' | 'quality_issues'
        ) =>
        (props: RowControlRowProps) => {
          context.logOverviewContext$.next({
            recordId: props.record.id,
            initialAccordionSection: actionName,
          });
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

const queryContainsMetadataIgnored = (query: AggregateQuery) =>
  retrieveMetadataColumns(query.esql).includes('_ignored');
