/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import { SearchSessionStatus } from '../../../../../../../common';
import type { OnActionComplete } from '../..';
import { TableText } from '../..';
import { dateString } from '../../../lib/date_string';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import { getExpirationStatus } from '../../../lib/get_expiration_status';
import type { UISession } from '../../../types';
import type { SearchUsageCollector } from '../../../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../../../server/config';
import { appIdColumn, nameColumn, actionsColumn, statusColumn } from '.';

export const getColumns = ({
  core,
  api,
  config,
  timezone,
  onActionComplete,
  kibanaVersion,
  searchUsageCollector,
}: {
  core: CoreStart;
  api: SearchSessionsMgmtAPI;
  config: SearchSessionsConfigSchema;
  timezone: string;
  onActionComplete: OnActionComplete;
  kibanaVersion: string;
  searchUsageCollector: SearchUsageCollector;
}): Array<EuiBasicTableColumn<UISession>> => {
  // Use a literal array of table column definitions to detail a UISession object
  return [
    // App
    appIdColumn,

    // Name, links to app and displays the search session data
    {
      ...nameColumn({
        core,
        searchUsageCollector,
        kibanaVersion,
      }),
      width: '20%',
    },

    // # Searches
    {
      field: 'numSearches',
      name: i18n.translate('data.mgmt.searchSessions.table.numSearches', {
        defaultMessage: '# Searches',
      }),
      sortable: true,
      render: (numSearches: UISession['numSearches'], session) => (
        <TableText color="subdued" data-test-subj="sessionManagementNumSearchesCol">
          {numSearches}
        </TableText>
      ),
    },

    // Session status
    statusColumn(timezone),

    // Started date
    {
      field: 'created',
      name: i18n.translate('data.mgmt.searchSessions.table.headerStarted', {
        defaultMessage: 'Created',
      }),
      sortable: true,
      render: (created: UISession['created'], { id }) => {
        try {
          const startedOn = dateString(created, timezone);
          return (
            <TableText color="subdued" data-test-subj="sessionManagementCreatedCol">
              {startedOn}
            </TableText>
          );
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          return <TableText>{created}</TableText>;
        }
      },
    },

    // Expiration date
    {
      field: 'expires',
      name: i18n.translate('data.mgmt.searchSessions.table.headerExpiration', {
        defaultMessage: 'Expiration',
      }),
      sortable: true,
      render: (expires: UISession['expires'], { id, status }) => {
        if (
          expires &&
          status !== SearchSessionStatus.EXPIRED &&
          status !== SearchSessionStatus.CANCELLED &&
          status !== SearchSessionStatus.ERROR
        ) {
          try {
            const expiresOn = dateString(expires, timezone);

            // return
            return (
              <TableText color="subdued" data-test-subj="sessionManagementExpiresCol">
                {expiresOn}
              </TableText>
            );
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            return <TableText>{expires}</TableText>;
          }
        }
        return (
          <TableText color="subdued" data-test-subj="sessionManagementExpiresCol">
            --
          </TableText>
        );
      },
    },

    // Highlight Badge, if completed session expires soon
    {
      field: 'status',
      name: '',
      sortable: false,
      render: (status, { expires }) => {
        const expirationStatus = getExpirationStatus(config, expires);
        if (expirationStatus) {
          const { toolTipContent, statusContent } = expirationStatus;

          return (
            <EuiToolTip content={toolTipContent}>
              <EuiBadge tabIndex={0} color="warning" data-test-subj="sessionManagementStatusCol">
                {statusContent}
              </EuiBadge>
            </EuiToolTip>
          );
        }

        return <TableText />;
      },
    },

    // Action(s) in-line in the row, additional action(s) in the popover, no column header
    actionsColumn({
      api,
      core,
      onActionComplete,
    }),
  ];
};
