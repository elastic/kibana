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
  type LogDocumentOverview,
} from '@kbn/discover-utils';
import { fieldConstants } from '@kbn/discover-utils';
import { ContentFrameworkSection } from '../../../content_framework/lazy_content_framework_section';
import { ContentFrameworkChart } from '../../../content_framework/chart';
import type { ContentFrameworkSectionProps } from '../../../content_framework/section/section';
import { useDataSourcesContext } from '../../../observability/traces/hooks/use_data_sources';
import { useGetGenerateDiscoverLink } from '../../../observability/traces/hooks/use_get_generate_discover_link';
import { getEsqlQuery } from './get_esql_query';

const sectionTitle = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.title',
  {
    defaultMessage: 'Similar errors',
  }
);
const latencyTitle = i18n.translate(
  'unifiedDocViewer.observability.traces.similarErrors.latency.title',
  {
    defaultMessage: 'Occurrences',
  }
);
const discoverBtnLabel = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.openInDiscover.button',
  { defaultMessage: 'Open in Discover' }
);
const discoverBtnAria = i18n.translate(
  'unifiedDocViewer.observability.traces.similarErrors.openInDiscover.label',
  { defaultMessage: 'Open in Discover link' }
);

export interface SimilarErrorsProps {
  hit: DataTableRecord;
  formattedDoc: LogDocumentOverview;
}

export function SimilarErrors({ hit, formattedDoc }: SimilarErrorsProps) {
  const serviceNameValue = formattedDoc[fieldConstants.SERVICE_NAME_FIELD];
  const culpritValue = formattedDoc[fieldConstants.ERROR_CULPRIT_FIELD];
  const { field: messageField, value: messageValue } = getMessageFieldWithFallbacks(formattedDoc, {
    includeFormattedValue: true,
  });
  const { field: typeField, value: typeValue } = getLogExceptionTypeFieldWithFallback(formattedDoc);

  const sectionDescription = useMemo(() => {
    const fieldsWithValues: string[] = [fieldConstants.SERVICE_NAME_FIELD];

    if (culpritValue) {
      fieldsWithValues.push(fieldConstants.ERROR_CULPRIT_FIELD);
    }
    if (messageValue) {
      fieldsWithValues.push(messageField || 'message');
    }
    if (typeValue) {
      fieldsWithValues.push(typeField || 'exception.type');
      // TODO check this value, I've seen a case with ["ProgrammingError", "UndefinedTable"] as value
    }

    if (fieldsWithValues.length === 0) {
      return undefined;
    }

    return i18n.translate(
      'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.description',
      {
        defaultMessage: 'These errors are based on the following fields: {fields}.',
        values: {
          fields: fieldsWithValues.join(', '),
        },
      }
    );
  }, [culpritValue, messageValue, typeValue, messageField, typeField]);

  // TODO extract to a higher level folder
  const { indexes } = useDataSourcesContext();
  const { generateDiscoverLink } = useGetGenerateDiscoverLink({ indexPattern: indexes.logs });

  const esqlQuery = getEsqlQuery({
    serviceName: formattedDoc[fieldConstants.SERVICE_NAME_FIELD],
    culprit: culpritValue
      ? { fieldName: fieldConstants.ERROR_CULPRIT_FIELD, value: culpritValue }
      : undefined,
    message: messageValue ? { fieldName: messageField, value: messageValue } : undefined,
    type: typeValue ? { fieldName: typeField, value: typeValue } : undefined,
  });

  const discoverUrl = useMemo(
    () => generateDiscoverLink(esqlQuery),
    [generateDiscoverLink, esqlQuery]
  );

  const sectionActions: ContentFrameworkSectionProps['actions'] = useMemo(
    () =>
      discoverUrl
        ? [
            {
              dataTestSubj: 'docViewerSimilarErrorsOpenInDiscoverButton',
              label: discoverBtnLabel,
              href: discoverUrl,
              icon: 'discoverApp',
              ariaLabel: discoverBtnAria,
            },
          ]
        : [],
    [discoverUrl]
  );

  // TODO check if there's at least one of the other fields with value
  if (serviceNameValue) {
    return undefined;
  }

  return (
    <ContentFrameworkSection
      id="similarErrors"
      data-test-subj="docViewerSimilarErrorsSection"
      title={sectionTitle}
      actions={sectionActions}
      description={sectionDescription}
    >
      <ContentFrameworkChart
        data-test-subj="docViewerSimilarErrorsLatencyChart"
        title={latencyTitle}
      >
        CHART HERE
      </ContentFrameworkChart>
    </ContentFrameworkSection>
  );
}
