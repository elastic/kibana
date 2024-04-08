/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CloudProvider, CloudProviderIcon } from '@kbn/custom-icons';
import { useMeasure } from 'react-use/lib';
import { first } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { DataTableRecord, DocumentOverview, fieldConstants } from '@kbn/discover-utils';
import { HighlightField } from './sub_components/highlight_field';
import { HighlightSection } from './sub_components/highlight_section';
import { HighlightContainer } from './sub_components/highlight_container';

interface ColumnWidth {
  columns: 1 | 2 | 3;
  fieldWidth: number;
}

export const useColumnWidth = (width: number): ColumnWidth => {
  const { euiTheme } = useEuiTheme();

  const numberOfColumns = width > euiTheme.breakpoint.m ? 3 : width > euiTheme.breakpoint.s ? 2 : 1;
  const WIDTH_FACTOR = 1.25;
  const fieldWidth = width / (numberOfColumns * WIDTH_FACTOR);

  return {
    columns: numberOfColumns,
    fieldWidth,
  };
};

export function LogsOverviewHighlights({
  formattedDoc,
  flattenedDoc,
}: {
  formattedDoc: DocumentOverview;
  flattenedDoc: DataTableRecord['flattened'];
}) {
  const [ref, dimensions] = useMeasure<HTMLDivElement>();
  const { columns, fieldWidth } = useColumnWidth(dimensions.width);
  return (
    <HighlightContainer ref={ref}>
      {/* Service & Infrastructure highlight */}
      <HighlightSection
        title={serviceInfraAccordionTitle}
        columns={columns}
        data-test-subj="unifiedDocViewLogsOverviewHighlightSectionServiceInfra"
      >
        {formattedDoc[fieldConstants.SERVICE_NAME_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewService"
            field={fieldConstants.SERVICE_NAME_FIELD}
            formattedValue={formattedDoc[fieldConstants.SERVICE_NAME_FIELD]}
            label={ServiceLabel}
            value={flattenedDoc[fieldConstants.SERVICE_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.HOST_NAME_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewHostName"
            field={fieldConstants.HOST_NAME_FIELD}
            formattedValue={formattedDoc[fieldConstants.HOST_NAME_FIELD]}
            label={HostNameLabel}
            value={flattenedDoc[fieldConstants.HOST_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.TRACE_ID_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewTrace"
            field={fieldConstants.TRACE_ID_FIELD}
            formattedValue={formattedDoc[fieldConstants.TRACE_ID_FIELD]}
            label={TraceLabel}
            value={flattenedDoc[fieldConstants.TRACE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewClusterName"
            field={fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD}
            formattedValue={formattedDoc[fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD]}
            label={OrchestratorClusterNameLabel}
            value={flattenedDoc[fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewResourceId"
            field={fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD}
            formattedValue={formattedDoc[fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]}
            label={OrchestratorResourceIdLabel}
            value={flattenedDoc[fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
      {/* Cloud highlight */}
      <HighlightSection
        title={cloudAccordionTitle}
        columns={columns}
        data-test-subj="unifiedDocViewLogsOverviewHighlightSectionCloud"
      >
        {formattedDoc[fieldConstants.CLOUD_PROVIDER_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudProvider"
            field={fieldConstants.CLOUD_PROVIDER_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_PROVIDER_FIELD]}
            icon={
              <CloudProviderIcon
                cloudProvider={first(
                  (flattenedDoc[fieldConstants.CLOUD_PROVIDER_FIELD] ?? []) as CloudProvider[]
                )}
              />
            }
            label={CloudProviderLabel}
            value={flattenedDoc[fieldConstants.CLOUD_PROVIDER_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_REGION_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudRegion"
            field={fieldConstants.CLOUD_REGION_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_REGION_FIELD]}
            label={CloudRegionLabel}
            value={flattenedDoc[fieldConstants.CLOUD_REGION_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudAz"
            field={fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD]}
            label={CloudAvailabilityZoneLabel}
            value={flattenedDoc[fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_PROJECT_ID_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudProjectId"
            field={fieldConstants.CLOUD_PROJECT_ID_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_PROJECT_ID_FIELD]}
            label={CloudProjectIdLabel}
            value={flattenedDoc[fieldConstants.CLOUD_PROJECT_ID_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_INSTANCE_ID_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewCloudInstanceId"
            field={fieldConstants.CLOUD_INSTANCE_ID_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_INSTANCE_ID_FIELD]}
            label={CloudInstanceIdLabel}
            value={flattenedDoc[fieldConstants.CLOUD_INSTANCE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
      {/* Other highlights */}
      <HighlightSection
        title={otherAccordionTitle}
        columns={columns}
        data-test-subj="unifiedDocViewLogsOverviewHighlightSectionOther"
      >
        {formattedDoc[fieldConstants.LOG_FILE_PATH_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewLogPathFile"
            field={fieldConstants.LOG_FILE_PATH_FIELD}
            formattedValue={formattedDoc[fieldConstants.LOG_FILE_PATH_FIELD]}
            label={LogPathFileLabel}
            value={flattenedDoc[fieldConstants.LOG_FILE_PATH_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.DATASTREAM_DATASET_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewDataset"
            field={fieldConstants.DATASTREAM_DATASET_FIELD}
            formattedValue={formattedDoc[fieldConstants.DATASTREAM_DATASET_FIELD]}
            label={DatasetLabel}
            value={flattenedDoc[fieldConstants.DATASTREAM_DATASET_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.DATASTREAM_NAMESPACE_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewNamespace"
            field={fieldConstants.DATASTREAM_NAMESPACE_FIELD}
            formattedValue={formattedDoc[fieldConstants.DATASTREAM_NAMESPACE_FIELD]}
            label={NamespaceLabel}
            value={flattenedDoc[fieldConstants.DATASTREAM_NAMESPACE_FIELD]}
            width={fieldWidth}
            useBadge
          />
        )}
        {formattedDoc[fieldConstants.AGENT_NAME_FIELD] && (
          <HighlightField
            data-test-subj="unifiedDocViewLogsOverviewLogShipper"
            field={fieldConstants.AGENT_NAME_FIELD}
            formattedValue={formattedDoc[fieldConstants.AGENT_NAME_FIELD]}
            label={ShipperLabel}
            value={flattenedDoc[fieldConstants.AGENT_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
    </HighlightContainer>
  );
}

const ServiceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.service', {
  defaultMessage: 'Service',
});

const TraceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.trace', {
  defaultMessage: 'Trace',
});

const HostNameLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.hostName', {
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

const OrchestratorClusterNameLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.orchestratorClusterName',
  {
    defaultMessage: 'Orchestrator cluster Name',
  }
);

const OrchestratorResourceIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.orchestratorResourceId',
  {
    defaultMessage: 'Orchestrator resource ID',
  }
);

const CloudProviderLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudProvider',
  {
    defaultMessage: 'Cloud provider',
  }
);

const CloudRegionLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.cloudRegion', {
  defaultMessage: 'Cloud region',
});

const CloudAvailabilityZoneLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudAvailabilityZone',
  {
    defaultMessage: 'Cloud availability zone',
  }
);

const CloudProjectIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudProjectId',
  {
    defaultMessage: 'Cloud project ID',
  }
);

const CloudInstanceIdLabel = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.label.cloudInstanceId',
  {
    defaultMessage: 'Cloud instance ID',
  }
);

const LogPathFileLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.logPathFile', {
  defaultMessage: 'Log path file',
});

const NamespaceLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.namespace', {
  defaultMessage: 'Namespace',
});

const DatasetLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.dataset', {
  defaultMessage: 'Dataset',
});

const ShipperLabel = i18n.translate('unifiedDocViewer.docView.logsOverview.label.shipper', {
  defaultMessage: 'Shipper',
});
