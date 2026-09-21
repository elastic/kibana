/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import {
  getLogExceptionTypeFieldWithFallback,
  getMessageFieldWithFallbacks,
  type DataTableRecord,
  fieldConstants,
} from '@kbn/discover-utils';
import { getFieldValueWithFallback } from '@kbn/discover-utils/src/utils';
import { ContentFrameworkSection } from '../../../content_framework/lazy_content_framework_section';
import { useDataSourcesContext } from '../../../../hooks/use_data_sources';
import { getEsqlQuery } from './get_esql_query';
import { useQueryableEsqlColumns } from './use_queryable_esql_columns';
import { SimilarErrorsOccurrencesChart } from './similar_errors_occurrences_chart';
import { buildSectionDescription, type FieldInfo } from './build_section_description';
import { useDiscoverLinkAndEsqlQuery } from '../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../hooks/use_open_in_discover_section_action';
import { LOGS_DOC_VIEWER_EBT_ELEMENTS, LOGS_DOC_VIEWER_EBT_DETAILS } from '../../ebt_constants';

const createFieldInfo = (value: unknown, field: string | undefined): FieldInfo | undefined => {
  return value && field ? { value, field } : undefined;
};

interface SimilarErrorFields {
  serviceName?: FieldInfo;
  culprit?: FieldInfo;
  message?: FieldInfo;
  type?: FieldInfo;
}

const hasErrorIdentifyingField = ({ culprit, message, type }: SimilarErrorFields): boolean =>
  Boolean(culprit || message || type);

const sectionTitle = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.title',
  {
    defaultMessage: 'Similar errors',
  }
);

const unavailableMessage = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.unavailable',
  {
    defaultMessage:
      "Similar errors can't be displayed because the fields of this document are missing or have conflicting mappings in the configured log sources.",
  }
);

export interface SimilarErrorsProps {
  hit: DataTableRecord;
}

export function SimilarErrors({ hit }: SimilarErrorsProps) {
  const { indexes } = useDataSourcesContext();
  const hitFlattened = hit.flattened;
  const { field: serviceNameField, value: serviceNameValue } = getFieldValueWithFallback(
    hitFlattened,
    fieldConstants.SERVICE_NAME_FIELD
  );
  const { field: groupingNameField, value: groupingNameValue } = getFieldValueWithFallback(
    hitFlattened,
    fieldConstants.ERROR_GROUPING_NAME_FIELD
  );
  const { field: culpritField, value: culpritValue } = getFieldValueWithFallback(
    hitFlattened,
    fieldConstants.ERROR_CULPRIT_FIELD
  );
  const { field: messageField, value: messageValue } = getMessageFieldWithFallbacks(hitFlattened);
  const { field: typeField, originalValue: typeValue } =
    getLogExceptionTypeFieldWithFallback(hitFlattened);
  const { value: timestampValue } = getFieldValueWithFallback(
    hitFlattened,
    fieldConstants.TIMESTAMP_FIELD
  );
  const normalizedTimestamp = Array.isArray(timestampValue)
    ? String(timestampValue[0])
    : String(timestampValue);

  const fields = useMemo<SimilarErrorFields>(
    () => ({
      serviceName: createFieldInfo(serviceNameValue, serviceNameField),
      culprit: createFieldInfo(culpritValue, culpritField),
      message: createFieldInfo(messageValue, messageField),
      type: createFieldInfo(typeValue, typeField),
    }),
    [
      serviceNameValue,
      serviceNameField,
      culpritValue,
      culpritField,
      messageValue,
      messageField,
      typeValue,
      typeField,
    ]
  );

  // Similar errors are anchored on the service name plus at least one
  // error-identifying field.
  const shouldRender = Boolean(fields.serviceName) && hasErrorIdentifyingField(fields);

  // The WHERE clause below runs against the all-logs index pattern, not the
  // current document's index. Any referenced column that is unmapped or has
  // conflicting mappings across that pattern fails the whole ES|QL query with
  // a verification_exception, so resolve the pattern's columns first and only
  // query the fields that are usable.
  const { queryableColumns, loading: resolvingColumns } = useQueryableEsqlColumns(
    shouldRender ? indexes.logs : undefined
  );

  const queryable = useMemo(() => {
    // Fail open while resolving or if resolution failed (`queryableColumns`
    // undefined): treat every field as queryable. Each field is gated on the
    // column the generated query references, which is not always the column
    // the document's value came from: `getEsqlQuery` builds the service name
    // and culprit predicates on the canonical ECS columns even when the value
    // was read from an OTel fallback field.
    const gate = (info?: FieldInfo, queryColumn = info?.field ?? '') =>
      info && (!queryableColumns || queryableColumns.has(queryColumn)) ? info : undefined;
    return {
      serviceName: gate(fields.serviceName, fieldConstants.SERVICE_NAME_FIELD),
      culprit: gate(fields.culprit, fieldConstants.ERROR_CULPRIT_FIELD),
      message: gate(fields.message),
      type: gate(fields.type),
    };
  }, [fields, queryableColumns]);
  const hasQueryableErrorField = hasErrorIdentifyingField(queryable);

  const sectionDescription = useMemo(
    () =>
      buildSectionDescription({
        ...queryable,
        groupingName: createFieldInfo(groupingNameValue, groupingNameField),
      }),
    [queryable, groupingNameValue, groupingNameField]
  );

  const esqlQueryWhereClause = useMemo(() => {
    // A match on service.name alone is too broad to present as similar errors,
    // so require at least one queryable error-identifying predicate.
    if (resolvingColumns || !hasQueryableErrorField) {
      return undefined;
    }
    return getEsqlQuery({
      serviceName: queryable.serviceName ? String(queryable.serviceName.value) : undefined,
      culprit: queryable.culprit ? String(queryable.culprit.value) : undefined,
      message: queryable.message
        ? { fieldName: queryable.message.field, value: String(queryable.message.value) }
        : undefined,
      type: queryable.type
        ? {
            fieldName: queryable.type.field,
            value: Array.isArray(queryable.type.value)
              ? queryable.type.value.map(String)
              : String(queryable.type.value),
          }
        : undefined,
    });
  }, [resolvingColumns, hasQueryableErrorField, queryable]);

  const { discoverUrl, esqlQueryString } = useDiscoverLinkAndEsqlQuery({
    indexPattern: indexes.logs,
    whereClause: esqlQueryWhereClause,
  });

  const openInDiscoverSectionAction = useOpenInDiscoverSectionAction({
    href: discoverUrl,
    esql: esqlQueryString,
    tabLabel: sectionTitle,
    dataTestSubj: 'docViewerSimilarErrorsOpenInDiscoverButton',
    ebt: {
      element: LOGS_DOC_VIEWER_EBT_ELEMENTS.SIMILAR_ERRORS,
      detail: LOGS_DOC_VIEWER_EBT_DETAILS.LOG_DOC,
    },
  });

  const actions = useMemo(
    () => (openInDiscoverSectionAction ? [openInDiscoverSectionAction] : []),
    [openInDiscoverSectionAction]
  );

  if (!shouldRender) {
    return undefined;
  }

  const showUnavailableCallout = !resolvingColumns && !esqlQueryWhereClause;

  return (
    <ContentFrameworkSection
      id="similarErrors"
      data-test-subj="docViewerSimilarErrorsSection"
      title={sectionTitle}
      actions={actions}
      description={sectionDescription}
    >
      {showUnavailableCallout ? (
        <EuiCallOut
          announceOnMount
          size="s"
          title={unavailableMessage}
          data-test-subj="docViewerSimilarErrorsUnavailableCallout"
        />
      ) : (
        <SimilarErrorsOccurrencesChart
          baseEsqlQuery={esqlQueryWhereClause}
          currentDocumentTimestamp={normalizedTimestamp}
        />
      )}
    </ContentFrameworkSection>
  );
}
