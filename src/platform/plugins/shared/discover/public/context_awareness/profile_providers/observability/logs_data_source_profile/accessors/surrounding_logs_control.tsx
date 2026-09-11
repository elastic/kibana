/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { buildPhraseFilter } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { OverlayRef } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  RowControlColumn,
  RowControlComponent,
  RowControlRowProps,
} from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import { SurroundingLogsFlyoutContent } from './surrounding_logs_flyout';

// ECS fields checked in priority order for identifying a "service instance"
const INSTANCE_IDENTITY_FIELDS = [
  'kubernetes.pod.uid',
  'container.id',
  'service.node.name',
  'service.name',
  'host.name',
] as const;

const surroundingLogsLabel = i18n.translate('discover.logs.surroundingLogs.buttonLabel', {
  defaultMessage: 'View surrounding logs',
});

const surroundingLogsTooltip = i18n.translate('discover.logs.surroundingLogs.buttonTooltip', {
  defaultMessage: 'View surrounding logs for the same service instance',
});

export function getInstanceFilter(record: DataTableRecord, dataView: DataView): Filter | undefined {
  for (const fieldName of INSTANCE_IDENTITY_FIELDS) {
    const raw = record.flattened[fieldName];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null) continue;
    const field = dataView.getFieldByName(fieldName);
    if (!field) continue;
    return buildPhraseFilter(field, String(value), dataView);
  }
  return undefined;
}

const SurroundingLogs = ({
  Control,
  rowProps: { record },
  dataView,
  services,
}: {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
  dataView: DataView;
  services: ProfileProviderServices;
}) => {
  const instanceFilter = getInstanceFilter(record, dataView);

  return (
    <Control
      data-test-subj="docTableSurroundingLogsButton"
      iconType="inspect"
      label={surroundingLogsLabel}
      tooltipContent={surroundingLogsTooltip}
      onClick={() => {
        // Capture the handle so the flyout content can close itself on row navigation.
        let overlayRef: OverlayRef;
        const onClose = () => overlayRef?.close();
        overlayRef = services.core.overlays.openFlyout(
          toMountPoint(
            <SurroundingLogsFlyoutContent
              anchor={record}
              dataView={dataView}
              instanceFilter={instanceFilter}
              services={services}
              onClose={onClose}
            />,
            services.core
          ),
          { size: 'l', 'aria-labelledby': 'surroundingLogsFlyoutTitle' }
        );
      }}
    />
  );
};

export const createSurroundingLogsControl = (
  services: ProfileProviderServices,
  dataView: DataView
): RowControlColumn => ({
  id: 'surroundingLogs',
  isAvailable: ({ record }: RowControlRowProps) =>
    dataView.isTimeBased() && Boolean(record.raw._id),
  render: (Control, rowProps) => (
    <SurroundingLogs Control={Control} rowProps={rowProps} dataView={dataView} services={services} />
  ),
});
