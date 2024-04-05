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
import { fieldConstants } from '@kbn/discover-utils';
import { FlyoutDoc, LogDocument } from '../../../common/document';
import { HighlightField } from './sub_components/highlight_field';
import { HighlightSection } from './sub_components/highlight_section';
import { HighlightContainer } from './sub_components/highlight_container';

interface FlyoutColumnWidth {
  columns: 1 | 2 | 3;
  fieldWidth: number;
}

export const useFlyoutColumnWidth = (width: number): FlyoutColumnWidth => {
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
  formattedDoc: FlyoutDoc;
  flattenedDoc: LogDocument['flattened'];
}) {
  const [ref, dimensions] = useMeasure<HTMLDivElement>();
  const { columns, fieldWidth } = useFlyoutColumnWidth(dimensions.width);
  return (
    <HighlightContainer ref={ref}>
      {/* Service & Infrastructure highlight */}
      <HighlightSection
        title={serviceInfraAccordionTitle}
        columns={columns}
        data-test-subj="logsExplorerFlyoutHighlightSectionServiceInfra"
      >
        {formattedDoc[fieldConstants.SERVICE_NAME_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutService"
            field={fieldConstants.SERVICE_NAME_FIELD}
            formattedValue={formattedDoc[fieldConstants.SERVICE_NAME_FIELD]}
            label={flyoutServiceLabel}
            value={flattenedDoc[fieldConstants.SERVICE_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.HOST_NAME_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutHostName"
            field={fieldConstants.HOST_NAME_FIELD}
            formattedValue={formattedDoc[fieldConstants.HOST_NAME_FIELD]}
            label={flyoutHostNameLabel}
            value={flattenedDoc[fieldConstants.HOST_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.TRACE_ID_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutTrace"
            field={fieldConstants.TRACE_ID_FIELD}
            formattedValue={formattedDoc[fieldConstants.TRACE_ID_FIELD]}
            label={flyoutTraceLabel}
            value={flattenedDoc[fieldConstants.TRACE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutClusterName"
            field={fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD}
            formattedValue={formattedDoc[fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD]}
            label={flyoutOrchestratorClusterNameLabel}
            value={flattenedDoc[fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutResourceId"
            field={fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD}
            formattedValue={formattedDoc[fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]}
            label={flyoutOrchestratorResourceIdLabel}
            value={flattenedDoc[fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
      {/* Cloud highlight */}
      <HighlightSection
        title={cloudAccordionTitle}
        columns={columns}
        data-test-subj="logsExplorerFlyoutHighlightSectionCloud"
      >
        {formattedDoc[fieldConstants.CLOUD_PROVIDER_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutCloudProvider"
            field={fieldConstants.CLOUD_PROVIDER_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_PROVIDER_FIELD]}
            icon={
              <CloudProviderIcon
                cloudProvider={first(
                  (flattenedDoc[fieldConstants.CLOUD_PROVIDER_FIELD] ?? []) as CloudProvider[]
                )}
              />
            }
            label={flyoutCloudProviderLabel}
            value={flattenedDoc[fieldConstants.CLOUD_PROVIDER_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_REGION_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutCloudRegion"
            field={fieldConstants.CLOUD_REGION_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_REGION_FIELD]}
            label={flyoutCloudRegionLabel}
            value={flattenedDoc[fieldConstants.CLOUD_REGION_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutCloudAz"
            field={fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD]}
            label={flyoutCloudAvailabilityZoneLabel}
            value={flattenedDoc[fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_PROJECT_ID_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutCloudProjectId"
            field={fieldConstants.CLOUD_PROJECT_ID_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_PROJECT_ID_FIELD]}
            label={flyoutCloudProjectIdLabel}
            value={flattenedDoc[fieldConstants.CLOUD_PROJECT_ID_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.CLOUD_INSTANCE_ID_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutCloudInstanceId"
            field={fieldConstants.CLOUD_INSTANCE_ID_FIELD}
            formattedValue={formattedDoc[fieldConstants.CLOUD_INSTANCE_ID_FIELD]}
            label={flyoutCloudInstanceIdLabel}
            value={flattenedDoc[fieldConstants.CLOUD_INSTANCE_ID_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
      {/* Other highlights */}
      <HighlightSection
        title={otherAccordionTitle}
        columns={columns}
        data-test-subj="logsExplorerFlyoutHighlightSectionOther"
      >
        {formattedDoc[fieldConstants.LOG_FILE_PATH_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutLogPathFile"
            field={fieldConstants.LOG_FILE_PATH_FIELD}
            formattedValue={formattedDoc[fieldConstants.LOG_FILE_PATH_FIELD]}
            label={flyoutLogPathFileLabel}
            value={flattenedDoc[fieldConstants.LOG_FILE_PATH_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.DATASTREAM_DATASET_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutDataset"
            field={fieldConstants.DATASTREAM_DATASET_FIELD}
            formattedValue={formattedDoc[fieldConstants.DATASTREAM_DATASET_FIELD]}
            label={flyoutDatasetLabel}
            value={flattenedDoc[fieldConstants.DATASTREAM_DATASET_FIELD]}
            width={fieldWidth}
          />
        )}
        {formattedDoc[fieldConstants.DATASTREAM_NAMESPACE_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutNamespace"
            field={fieldConstants.DATASTREAM_NAMESPACE_FIELD}
            formattedValue={formattedDoc[fieldConstants.DATASTREAM_NAMESPACE_FIELD]}
            label={flyoutNamespaceLabel}
            value={flattenedDoc[fieldConstants.DATASTREAM_NAMESPACE_FIELD]}
            width={fieldWidth}
            useBadge
          />
        )}
        {formattedDoc[fieldConstants.AGENT_NAME_FIELD] && (
          <HighlightField
            data-test-subj="logsExplorerFlyoutLogShipper"
            field={fieldConstants.AGENT_NAME_FIELD}
            formattedValue={formattedDoc[fieldConstants.AGENT_NAME_FIELD]}
            label={flyoutShipperLabel}
            value={flattenedDoc[fieldConstants.AGENT_NAME_FIELD]}
            width={fieldWidth}
          />
        )}
      </HighlightSection>
    </HighlightContainer>
  );
}

const flyoutServiceLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.service', {
  defaultMessage: 'Service',
});

const flyoutTraceLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.trace', {
  defaultMessage: 'Trace',
});

const flyoutHostNameLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.hostName', {
  defaultMessage: 'Host name',
});

const serviceInfraAccordionTitle = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.accordion.title.serviceInfra',
  {
    defaultMessage: 'Service & Infrastructure',
  }
);

const cloudAccordionTitle = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.accordion.title.cloud',
  {
    defaultMessage: 'Cloud',
  }
);

const otherAccordionTitle = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.accordion.title.other',
  {
    defaultMessage: 'Other',
  }
);

const flyoutOrchestratorClusterNameLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.orchestratorClusterName',
  {
    defaultMessage: 'Orchestrator cluster Name',
  }
);

const flyoutOrchestratorResourceIdLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.orchestratorResourceId',
  {
    defaultMessage: 'Orchestrator resource ID',
  }
);

const flyoutCloudProviderLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudProvider',
  {
    defaultMessage: 'Cloud provider',
  }
);

const flyoutCloudRegionLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.cloudRegion', {
  defaultMessage: 'Cloud region',
});

const flyoutCloudAvailabilityZoneLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudAvailabilityZone',
  {
    defaultMessage: 'Cloud availability zone',
  }
);

const flyoutCloudProjectIdLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudProjectId',
  {
    defaultMessage: 'Cloud project ID',
  }
);

const flyoutCloudInstanceIdLabel = i18n.translate(
  'xpack.logsExplorer.flyoutDetail.label.cloudInstanceId',
  {
    defaultMessage: 'Cloud instance ID',
  }
);

const flyoutLogPathFileLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.logPathFile', {
  defaultMessage: 'Log path file',
});

const flyoutNamespaceLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.namespace', {
  defaultMessage: 'Namespace',
});

const flyoutDatasetLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.dataset', {
  defaultMessage: 'Dataset',
});

const flyoutShipperLabel = i18n.translate('xpack.logsExplorer.flyoutDetail.label.shipper', {
  defaultMessage: 'Shipper',
});
