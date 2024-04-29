/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CloudProvider, CloudProviderIcon } from '@kbn/custom-icons';
import { first } from 'lodash';
import { i18n } from '@kbn/i18n';
import { DataTableRecord, LogDocumentOverview, fieldConstants } from '@kbn/discover-utils';
import { HighlightField } from './sub_components/highlight_field';
import { HighlightSection } from './sub_components/highlight_section';

export function LogsOverviewHighlights({
  formattedDoc,
  flattenedDoc,
}: {
  formattedDoc: LogDocumentOverview;
  flattenedDoc: DataTableRecord['flattened'];
}) {
  const getHighlightProps = (field: keyof LogDocumentOverview) => ({
    field,
    formattedValue: formattedDoc[field],
    value: flattenedDoc[field],
  });

  return (
    <>
      {/* Service & Infrastructure highlight */}
      <HighlightSection
        title={serviceInfraAccordionTitle}
        data-test-subj="unifiedDocViewLogsOverviewHighlightSectionServiceInfra"
      >
        {formattedDoc[fieldConstants.SERVICE_NAME_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewService"
            label={serviceLabel}
            {...getHighlightProps(fieldConstants.SERVICE_NAME_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.HOST_NAME_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewHostName"
            label={hostNameLabel}
            {...getHighlightProps(fieldConstants.HOST_NAME_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.TRACE_ID_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewTrace"
            label={traceLabel}
            {...getHighlightProps(fieldConstants.TRACE_ID_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewClusterName"
            label={orchestratorClusterNameLabel}
            {...getHighlightProps(fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewResourceId"
            label={orchestratorResourceIdLabel}
            {...getHighlightProps(fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD)}
          />
        )}
      </HighlightSection>
      {/* Cloud highlight */}
      <HighlightSection
        title={cloudAccordionTitle}
        data-test-subj="unifiedDocViewLogsOverviewHighlightSectionCloud"
      >
        {formattedDoc[fieldConstants.CLOUD_PROVIDER_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudProvider"
            label={cloudProviderLabel}
            icon={
              <CloudProviderIcon
                cloudProvider={first(
                  (flattenedDoc[fieldConstants.CLOUD_PROVIDER_FIELD] ?? []) as CloudProvider[]
                )}
              />
            }
            {...getHighlightProps(fieldConstants.CLOUD_PROVIDER_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_REGION_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudRegion"
            label={cloudRegionLabel}
            {...getHighlightProps(fieldConstants.CLOUD_REGION_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudAz"
            label={cloudAvailabilityZoneLabel}
            {...getHighlightProps(fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_PROJECT_ID_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudProjectId"
            label={cloudProjectIdLabel}
            {...getHighlightProps(fieldConstants.CLOUD_PROJECT_ID_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_INSTANCE_ID_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudInstanceId"
            label={cloudInstanceIdLabel}
            {...getHighlightProps(fieldConstants.CLOUD_INSTANCE_ID_FIELD)}
          />
        )}
      </HighlightSection>
      {/* Other highlights */}
      <HighlightSection
        title={otherAccordionTitle}
        data-test-subj="unifiedDocViewLogsOverviewHighlightSectionOther"
      >
        {formattedDoc[fieldConstants.LOG_FILE_PATH_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewLogPathFile"
            label={logPathFileLabel}
            {...getHighlightProps(fieldConstants.LOG_FILE_PATH_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.DATASTREAM_DATASET_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewDataset"
            label={datasetLabel}
            {...getHighlightProps(fieldConstants.DATASTREAM_DATASET_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.DATASTREAM_NAMESPACE_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewNamespace"
            label={namespaceLabel}
            useBadge
            {...getHighlightProps(fieldConstants.DATASTREAM_NAMESPACE_FIELD)}
          />
        )}
        {formattedDoc[fieldConstants.AGENT_NAME_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewLogShipper"
            label={shipperLabel}
            {...getHighlightProps(fieldConstants.AGENT_NAME_FIELD)}
          />
        )}
      </HighlightSection>
    </>
  );
}

const serviceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.service', {
  defaultMessage: 'Service',
});

const traceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.trace', {
  defaultMessage: 'Trace',
});

const hostNameLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.hostName', {
  defaultMessage: 'Host name',
});

const serviceInfraAccordionTitle = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.title.serviceInfra',
  {
    defaultMessage: 'Service & Infrastructure',
  }
);

const cloudAccordionTitle = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.title.cloud',
  {
    defaultMessage: 'Cloud',
  }
);

const otherAccordionTitle = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.title.other',
  {
    defaultMessage: 'Other',
  }
);

const orchestratorClusterNameLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.orchestratorClusterName',
  {
    defaultMessage: 'Orchestrator cluster Name',
  }
);

const orchestratorResourceIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.orchestratorResourceId',
  {
    defaultMessage: 'Orchestrator resource ID',
  }
);

const cloudProviderLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudProvider',
  {
    defaultMessage: 'Cloud provider',
  }
);

const cloudRegionLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.cloudRegion', {
  defaultMessage: 'Cloud region',
});

const cloudAvailabilityZoneLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudAvailabilityZone',
  {
    defaultMessage: 'Cloud availability zone',
  }
);

const cloudProjectIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudProjectId',
  {
    defaultMessage: 'Cloud project ID',
  }
);

const cloudInstanceIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudInstanceId',
  {
    defaultMessage: 'Cloud instance ID',
  }
);

const logPathFileLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.logPathFile', {
  defaultMessage: 'Log path file',
});

const namespaceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.namespace', {
  defaultMessage: 'Namespace',
});

const datasetLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.dataset', {
  defaultMessage: 'Dataset',
});

const shipperLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.shipper', {
  defaultMessage: 'Shipper',
});
