/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import { LogDocument, ResourceFields } from '@kbn/discover-utils/src';
import { EuiBadge, EuiFlexGroup, EuiFlexGroupProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { getAvailableResourceFields } from '../../../../utils/get_available_resource_fields';
import * as constants from '../../../../../common/data_types/logs/constants';
import { getUnformattedResourceFields } from './utils/resource';
import { FieldBadgeWithActions } from '../../../data_types/logs/cell_actions_popover';

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

const MAX_LIMITED_FIELDS_VISIBLE = 3;
const iconCss = css`
  margin-right: ${euiThemeVars.euiSizeXS};
`;

interface ResourceProps extends DataGridCellValueElementProps, EuiFlexGroupProps {
  /* When true, the column will render a predefined number of resources and indicates with a badge how many more we have */
  limited?: boolean;
  /* When true, every badge should truncate its content to fit in a shorted badge */
  truncated?: boolean;
}

export const Resource = ({ row, limited = false, truncated = false, ...props }: ResourceProps) => {
  const resourceDoc = getUnformattedResourceFields(row as LogDocument);

  const availableResourceFields = getAvailableResourceFields(row);

  const resourceFields: Array<{ name: keyof ResourceFields; Icon?: React.FC }> =
    availableResourceFields.map((name) => ({
      name,
      ...(name === constants.SERVICE_NAME_FIELD && {
        Icon: () => (
          <AgentIcon
            agentName={resourceDoc[constants.AGENT_NAME_FIELD] as AgentName}
            size="m"
            css={iconCss}
          />
        ),
      }),
    }));

  const displayedFields = limited
    ? resourceFields.slice(0, MAX_LIMITED_FIELDS_VISIBLE)
    : resourceFields;
  const extraFieldsCount = limited ? resourceFields.length - MAX_LIMITED_FIELDS_VISIBLE : 0;

  return (
    <EuiFlexGroup gutterSize="s" css={{ height: '100%' }} {...props}>
      {displayedFields.map(({ name, Icon }) => (
        <FieldBadgeWithActions
          key={name}
          property={name}
          text={resourceDoc[name] as string}
          icon={Icon}
          truncated={truncated}
        />
      ))}
      {extraFieldsCount > 0 && (
        <div>
          <EuiBadge>+{extraFieldsCount}</EuiBadge>
        </div>
      )}
    </EuiFlexGroup>
  );
};
