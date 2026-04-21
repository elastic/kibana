/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import {
  escapeAndPreserveHighlightTags,
  formatFieldValue,
  getFieldValue,
  OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE,
} from '@kbn/discover-utils';
import {
  CellActionsPopover,
  FieldBadgeWithActions,
} from '@kbn/discover-contextual-components/src/data_types/logs/components/cell_actions_popover';
import { i18n } from '@kbn/i18n';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import type { CellRenderersExtensionParams } from '../../../context_awareness';
import { AGENT_NAME_FIELD } from '../../../../common/data_types/logs/constants';
import { useEntityFlyoutSimulation } from '../../entity_flyout_simulation/entity_flyout_simulation_context';
import { readEntityFlyoutSimulationEnabled } from '../../entity_flyout_simulation/is_entity_flyout_simulation_enabled';

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));
const dataTestSubj = 'serviceNameCell';

const agentIconStyle = ({ euiTheme }: UseEuiTheme) => css`
  margin-right: ${euiTheme.size.xs};
`;

interface ServiceNameCellContentProps {
  serviceNameField: string;
  actions: CellRenderersExtensionParams['actions'];
  cellProps: DataGridCellValueElementProps;
}

function ServiceNameCellContent({
  serviceNameField,
  actions,
  cellProps,
}: ServiceNameCellContentProps) {
  const { core, share, uiSettings } = useDiscoverServices();
  const isEntityFlyoutSimulation = readEntityFlyoutSimulationEnabled(uiSettings);
  const entityFlyoutSimulation = useEntityFlyoutSimulation();

  const serviceNameValue = getFieldValue(cellProps.row, serviceNameField);
  const field = cellProps.dataView.getFieldByName(serviceNameField);
  const agentName = getFieldValue(cellProps.row, AGENT_NAME_FIELD) as AgentName;
  const otelSdkLanguage = getFieldValue(
    cellProps.row,
    OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE
  ) as AgentName | undefined;

  if (!serviceNameValue) {
    return <span data-test-subj={`${dataTestSubj}-empty`}>-</span>;
  }

  const agentNameIcon = otelSdkLanguage || agentName;

  const getIcon = () => (
    <EuiToolTip position="left" content={agentNameIcon} repositionOnScroll={true}>
      <AgentIcon agentName={agentNameIcon} size="m" css={agentIconStyle} />
    </EuiToolTip>
  );

  const value = formatFieldValue(
    serviceNameValue,
    cellProps.row.raw,
    cellProps.fieldFormats,
    cellProps.dataView,
    field,
    'html'
  );

  if (!isEntityFlyoutSimulation || !entityFlyoutSimulation) {
    return (
      <FieldBadgeWithActions
        onFilter={actions.addFilter}
        icon={getIcon}
        rawValue={serviceNameValue}
        value={value}
        name={serviceNameField}
        property={field}
        core={core}
        share={share}
      />
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={i18n.translate('discover.entitySimulation.openEntityFlyoutTooltip', {
            defaultMessage: 'Open simulated entity details (demo)',
          })}
          repositionOnScroll={true}
        >
          <EuiButtonEmpty
            size="xs"
            data-test-subj={`${dataTestSubj}-entitySimulationLink`}
            onClick={() => entityFlyoutSimulation.openEntityFlyout(String(serviceNameValue))}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{getIcon()}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: escapeAndPreserveHighlightTags(value),
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CellActionsPopover
          onFilter={actions.addFilter}
          property={field}
          name={serviceNameField}
          value={value}
          rawValue={serviceNameValue}
          renderPopoverTrigger={({ popoverTriggerProps }) => (
            <EuiButtonIcon
              display="empty"
              size="xs"
              iconType="filter"
              aria-label={i18n.translate('discover.entitySimulation.fieldFilterActions', {
                defaultMessage: 'Filter actions for {field}',
                values: { field: serviceNameField },
              })}
              {...popoverTriggerProps}
            />
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const getServiceNameCell =
  (serviceNameField: string, { actions }: CellRenderersExtensionParams) =>
  (cellProps: DataGridCellValueElementProps) => (
    <ServiceNameCellContent
      serviceNameField={serviceNameField}
      actions={actions}
      cellProps={cellProps}
    />
  );
