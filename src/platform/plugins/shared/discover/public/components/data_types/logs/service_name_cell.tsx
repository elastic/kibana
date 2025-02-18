/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiToolTip, UseEuiTheme } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import { formatFieldValue, getFieldValue } from '@kbn/discover-utils';
import { ServiceNameBadgeWithActions } from '@kbn/discover-contextual-components';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { CellRenderersExtensionParams } from '../../../context_awareness';
import { AGENT_NAME_FIELD } from '../../../../common/data_types/logs/constants';

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));
const dataTestSubj = 'serviceNameCell';

const agentIconStyle = ({ euiTheme }: UseEuiTheme) => css`
  margin-right: ${euiTheme.size.xs};
`;

export const getServiceNameCell =
  (serviceNameField: string, { actions }: CellRenderersExtensionParams) =>
  (props: DataGridCellValueElementProps) => {
    const { core, share } = useDiscoverServices();
    const serviceNameValue = getFieldValue(props.row, serviceNameField);
    const field = props.dataView.getFieldByName(serviceNameField);
    const agentName = getFieldValue(props.row, AGENT_NAME_FIELD) as AgentName;

    if (!serviceNameValue) {
      return <span data-test-subj={`${dataTestSubj}-empty`}>-</span>;
    }

    const getIcon = () => (
      <EuiToolTip position="left" content={agentName} repositionOnScroll={true}>
        <AgentIcon agentName={agentName} size="m" css={agentIconStyle} />
      </EuiToolTip>
    );

    const value = formatFieldValue(
      serviceNameValue,
      props.row.raw,
      props.fieldFormats,
      props.dataView,
      field,
      'html'
    );

    return (
      <ServiceNameBadgeWithActions
        onFilter={actions.addFilter}
        icon={getIcon}
        rawValue={serviceNameValue}
        // TODO: formatFieldValue doesn't actually return a string in certain circumstances, change
        // this line below once it does.
        value={typeof value === 'string' ? value : `${value}`}
        property={serviceNameField}
        core={core}
        share={share}
      />
    );
  };
