/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiIconTip, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { CoreStart } from '@kbn/core/public';
import { SearchSessionStatus } from '../../../../../../../common';
import type { SearchUsageCollector } from '../../../../../collectors';
import type { BackgroundSearchOpenedHandler, UISession } from '../../../types';
import { TableText } from '../..';

function isSessionRestorable(status: SearchSessionStatus) {
  return status === SearchSessionStatus.IN_PROGRESS || status === SearchSessionStatus.COMPLETE;
}

export const nameColumn = ({
  core,
  searchUsageCollector,
  kibanaVersion,
  onBackgroundSearchOpened,
}: {
  core: CoreStart;
  searchUsageCollector: SearchUsageCollector;
  kibanaVersion: string;
  onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
}): EuiBasicTableColumn<UISession> => ({
  field: 'name',
  name: i18n.translate('data.mgmt.searchSessions.table.headerName', {
    defaultMessage: 'Name',
  }),
  sortable: true,
  render: (name: UISession['name'], session) => {
    const { restoreUrl, reloadUrl, status, version } = session;

    const isRestorable = isSessionRestorable(status);
    const href = isRestorable ? restoreUrl : reloadUrl;
    const trackAction = isRestorable
      ? searchUsageCollector.trackSessionViewRestored
      : searchUsageCollector.trackSessionReloaded;
    const notRestorableWarning = isRestorable ? null : (
      <>
        <EuiIconTip
          type="warning"
          content={
            <FormattedMessage
              id="data.mgmt.searchSessions.table.notRestorableWarning"
              defaultMessage="The search session will be executed again. You can then save it for future use."
            />
          }
        />
      </>
    );

    // show version warning only if:
    // 1. the session was created in a different version of Kibana
    // AND
    // 2. if still can restore this session: it has IN_PROGRESS or COMPLETE status.
    const versionIncompatibleWarning =
      isRestorable && version !== kibanaVersion ? (
        <>
          {' '}
          <EuiIconTip
            type="warning"
            iconProps={{ 'data-test-subj': 'versionIncompatibleWarningTestSubj' }}
            content={
              <FormattedMessage
                id="data.mgmt.searchSessions.table.versionIncompatibleWarning"
                defaultMessage="This search session was created in a Kibana instance running a different version. It may not restore correctly."
              />
            }
          />
        </>
      ) : null;

    return (
      <RedirectAppLinks
        coreStart={{
          application: core.application,
        }}
      >
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiLink
          href={href}
          onClick={(event) => {
            trackAction?.();
            onBackgroundSearchOpened?.({ session, event });
          }}
          data-test-subj="sessionManagementNameCol"
        >
          <TableText>
            {name}
            {notRestorableWarning}
            {versionIncompatibleWarning}
          </TableText>
        </EuiLink>
      </RedirectAppLinks>
    );
  },
});
