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
import { useQueryableFields } from './use_queryable_fields';
import { SimilarErrorsOccurrencesChart } from './similar_errors_occurrences_chart';
import { buildSectionDescription, type FieldInfo } from './build_section_description';
import { useDiscoverLinkAndEsqlQuery } from '../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../hooks/use_open_in_discover_section_action';
import { LOGS_DOC_VIEWER_EBT_ELEMENTS, LOGS_DOC_VIEWER_EBT_DETAILS } from '../../ebt_constants';

const createFieldInfo = (value: unknown, field: string | undefined): FieldInfo | undefined => {
  return value && field ? { value, field } : undefined;
};

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

  const hasAtLeastOneErrorField = Boolean(culpritValue || messageValue || typeValue);
  const shouldRender = Boolean(serviceNameValue) && hasAtLeastOneErrorField;

  // The WHERE clause below runs against the all-logs index pattern, not the
  // current document's index. Any referenced column that is unmapped or has
  // conflicting mappings across that pattern fails the whole ES|QL query with
  // a verification_exception, so resolve the columns first and only query the
  // ones that are usable.
  const candidateFields = useMemo(() => {
    if (!shouldRender) {
      return [];
    }
    const fields: string[] = [fieldConstants.SERVICE_NAME_FIELD];
    if (culpritValue) {
      fields.push(fieldConstants.ERROR_CULPRIT_FIELD);
    }
    if (messageValue && messageField) {
      fields.push(messageField);
    }
    if (typeValue && typeField) {
      fields.push(typeField);
    }
    return fields;
  }, [shouldRender, culpritValue, messageValue, messageField, typeValue, typeField]);

  const { queryableFields, loading: resolvingFields } = useQueryableFields({
    indexPattern: indexes.logs,
    fields: candidateFields,
  });

  const isFieldQueryable = (fieldName?: string) =>
    Boolean(fieldName && (!queryableFields || queryableFields.has(fieldName)));

  const isServiceNameQueryable = Boolean(
    serviceNameValue && isFieldQueryable(fieldConstants.SERVICE_NAME_FIELD)
  );
  const isCulpritQueryable = Boolean(
    culpritValue && isFieldQueryable(fieldConstants.ERROR_CULPRIT_FIELD)
  );
  const isMessageQueryable = Boolean(messageValue && isFieldQueryable(messageField));
  const isTypeQueryable = Boolean(typeValue && isFieldQueryable(typeField));
  const hasQueryableErrorField = isCulpritQueryable || isMessageQueryable || isTypeQueryable;

  const sectionDescription = useMemo(
    () =>
      buildSectionDescription({
        serviceName: isServiceNameQueryable
          ? createFieldInfo(serviceNameValue, serviceNameField)
          : undefined,
        culprit: isCulpritQueryable ? createFieldInfo(culpritValue, culpritField) : undefined,
        message: isMessageQueryable ? createFieldInfo(messageValue, messageField) : undefined,
        type: isTypeQueryable ? createFieldInfo(typeValue, typeField) : undefined,
        groupingName: createFieldInfo(groupingNameValue, groupingNameField),
      }),
    [
      isServiceNameQueryable,
      serviceNameValue,
      serviceNameField,
      isCulpritQueryable,
      culpritValue,
      culpritField,
      isMessageQueryable,
      messageValue,
      messageField,
      isTypeQueryable,
      typeValue,
      typeField,
      groupingNameValue,
      groupingNameField,
    ]
  );

  const esqlQueryWhereClause = useMemo(() => {
    // A match on service.name alone is too broad to present as similar errors,
    // so require at least one queryable error-identifying predicate.
    if (resolvingFields || !hasQueryableErrorField) {
      return undefined;
    }
    return getEsqlQuery({
      serviceName: isServiceNameQueryable ? String(serviceNameValue) : undefined,
      culprit: isCulpritQueryable ? String(culpritValue) : undefined,
      message:
        isMessageQueryable && messageField
          ? { fieldName: messageField, value: String(messageValue) }
          : undefined,
      type:
        isTypeQueryable && typeField
          ? {
              fieldName: typeField,
              value: Array.isArray(typeValue) ? typeValue.map(String) : String(typeValue),
            }
          : undefined,
    });
  }, [
    resolvingFields,
    hasQueryableErrorField,
    isServiceNameQueryable,
    serviceNameValue,
    isCulpritQueryable,
    culpritValue,
    isMessageQueryable,
    messageField,
    messageValue,
    isTypeQueryable,
    typeField,
    typeValue,
  ]);

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

  const showUnavailableCallout = !resolvingFields && !esqlQueryWhereClause;

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
