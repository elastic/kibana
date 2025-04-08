/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDegradedDocsControl, createStacktraceControl } from '@kbn/discover-utils';
import { retrieveMetadataColumns } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { BasicPrettyPrinter, mutate, parse } from '@kbn/esql-ast';
import { IGNORED_FIELD } from '@kbn/discover-utils/src/field_constants';
import type { LogsDataSourceProfileProvider } from '../profile';

export const getRowAdditionalLeadingControls: LogsDataSourceProfileProvider['profile']['getRowAdditionalLeadingControls'] =

    (prev, { context }) =>
    (params) => {
      const additionalControls = prev(params) || [];
      const { updateESQLQuery, query, setExpandedDoc, setDocViewerAccordionState } = params;

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
        (actionName: 'stacktrace' | 'quality_issues') => (props: RowControlRowProps) => {
          if (!setExpandedDoc) {
            return;
          }

          context.initialLogOverviewAccordionSection$.next(actionName);
          setExpandedDoc(props.record);

          const dataTestSubj = {
            stacktrace: 'unifiedDocViewLogsOverviewStacktraceAccordion',
            quality_issues: 'unifiedDocViewLogsOverviewDegradedFieldsAccordion',
          };

          // Scroll the section into view
          const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(
              `[data-test-subj="${dataTestSubj[actionName]}"]`
            );
            if (element) {
              setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100); // We need this delay because after the element is rendered, it takes some time before it can be scrolledIntoView
              obs.disconnect();
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });
        };

      return [
        ...additionalControls,
        createDegradedDocsControl({
          enabled: isDegradedDocsControlEnabled,
          addIgnoredMetadataToQuery,
          onClick: leadingControlClick('quality_issues'),
        }),
        createStacktraceControl({ onClick: leadingControlClick('stacktrace') }),
      ];
    };

const queryContainsMetadataIgnored = (query: AggregateQuery) =>
  retrieveMetadataColumns(query.esql).includes('_ignored');
