/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import { getFieldValue } from '@kbn/discover-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import { CellRenderersExtensionParams } from '../../../context_awareness';
import { AGENT_NAME_FIELD } from '../../../../common/data_types/logs/constants';
import { ServiceNameBadgeWithActions } from './service_name_badge_with_actions';

const dataTestSubj = 'serviceNameCell';
const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

export const getServiceNameCell =
  (serviceNameField: string, { actions }: CellRenderersExtensionParams) =>
  (props: DataGridCellValueElementProps) => {
    const serviceNameValue = getFieldValue(props.row, serviceNameField) as string;
    const agentName = getFieldValue(props.row, AGENT_NAME_FIELD) as AgentName;

    if (!serviceNameValue) {
      return <span data-test-subj={`${dataTestSubj}-empty`}>-</span>;
    }

    const getIcon = () => (
      <EuiToolTip position="left" content={agentName} repositionOnScroll={true}>
        <AgentIcon
          agentName={agentName}
          size="m"
          css={css`
            margin-right: ${euiThemeVars.euiSizeXS};
          `}
        />
      </EuiToolTip>
    );

    return (
      <ServiceNameBadgeWithActions
        onFilter={actions.addFilter}
        icon={getIcon}
        value={serviceNameValue}
        property={serviceNameField}
      />
    );
  };
