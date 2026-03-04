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
import { SimilarErrorsOccurrencesChart } from './similar_errors_occurrences_chart';
import { buildSectionDescription, type FieldInfo } from './build_section_description';
import { useDiscoverLinkAndEsqlQuery } from '../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../hooks/use_open_in_discover_section_action';

const createFieldInfo = (value: unknown, field: string | undefined): FieldInfo | undefined => {
  return value && field ? { value, field } : undefined;
};

const sectionTitle = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.title',
  {
    defaultMessage: 'Similar errors',
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

  const sectionDescription = useMemo(
    () =>
      buildSectionDescription({
        serviceName: createFieldInfo(serviceNameValue, serviceNameField),
        culprit: createFieldInfo(culpritValue, culpritField),
        message: createFieldInfo(messageValue, messageField),
        type: createFieldInfo(typeValue, typeField),
        groupingName: createFieldInfo(groupingNameValue, groupingNameField),
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
      groupingNameValue,
      groupingNameField,
    ]
  );

  const esqlQueryWhereClause = useMemo(() => {
    return getEsqlQuery({
      serviceName: serviceNameValue ? String(serviceNameValue) : undefined,
      culprit: culpritValue ? String(culpritValue) : undefined,
      message:
        messageValue && messageField
          ? { fieldName: messageField, value: String(messageValue) }
          : undefined,
      type:
        typeValue && typeField
          ? {
              fieldName: typeField,
              value: Array.isArray(typeValue) ? typeValue.map(String) : String(typeValue),
            }
          : undefined,
    });
  }, [serviceNameValue, culpritValue, messageValue, messageField, typeValue, typeField]);

  const { discoverUrl, esqlQueryString } = useDiscoverLinkAndEsqlQuery({
    indexPattern: indexes.logs,
    whereClause: esqlQueryWhereClause,
  });

  const openInDiscoverSectionAction = useOpenInDiscoverSectionAction({
    href: discoverUrl,
    esql: esqlQueryString,
    tabLabel: sectionTitle,
    dataTestSubj: 'docViewerSimilarErrorsOpenInDiscoverButton',
  });

  const actions = useMemo(
    () => (openInDiscoverSectionAction ? [openInDiscoverSectionAction] : []),
    [openInDiscoverSectionAction]
  );

  const hasAtLeastOneErrorField = culpritValue || messageValue || typeValue;
  if (!serviceNameValue || !hasAtLeastOneErrorField) {
    return undefined;
  }

  return (
    <ContentFrameworkSection
      id="similarErrors"
      data-test-subj="docViewerSimilarErrorsSection"
      title={sectionTitle}
      actions={actions}
      description={sectionDescription}
    >
      <SimilarErrorsOccurrencesChart
        baseEsqlQuery={esqlQueryWhereClause}
        currentDocumentTimestamp={normalizedTimestamp}
      />
    </ContentFrameworkSection>
  );
}
