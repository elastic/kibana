/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { hasActiveModifierKey } from '@kbn/shared-ux-utility';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { SearchSessionStatus } from '../../../../../../../common';
import type { SearchUsageCollector } from '../../../../../collectors';
import type { BackgroundSearchOpenedHandler, UISession } from '../../../types';
import { TableText } from '../..';

function isSessionRestorable(status: SearchSessionStatus) {
  return status === SearchSessionStatus.IN_PROGRESS || status === SearchSessionStatus.COMPLETE;
}

const NameColumnText = ({
  status,
  children,
  href,
  onClick,
}: {
  status: SearchSessionStatus;
  children: React.ReactNode;
  href: string;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) => {
  const hideLink = status === SearchSessionStatus.IN_PROGRESS;

  if (hideLink)
    return (
      <EuiText data-test-subj="sessionManagementNameText" color="subdued">
        {children}
      </EuiText>
    );

  return (
    <EuiLink href={href} onClick={onClick} data-test-subj="sessionManagementNameLink">
      {children}
    </EuiLink>
  );
};

export const nameColumn = ({
  searchUsageCollector,
  kibanaVersion,
  navigateToUrl,
  onBackgroundSearchOpened,
}: {
  searchUsageCollector: SearchUsageCollector;
  kibanaVersion: string;
  navigateToUrl?: CoreStart['application']['navigateToUrl'];
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
      <EuiIconTip
        type="warning"
        content={
          <FormattedMessage
            id="data.mgmt.searchSessions.table.notRestorableWarning"
            defaultMessage="The background search will be executed again. You can then save it for future use."
          />
        }
      />
    );

    // show version warning only if:
    // 1. the session was created in a different version of Kibana
    // AND
    // 2. if still can restore this session: it has IN_PROGRESS or COMPLETE status.
    const versionIncompatibleWarning =
      isRestorable && version !== kibanaVersion ? (
        <EuiIconTip
          type="warning"
          iconProps={{ 'data-test-subj': 'versionIncompatibleWarningTestSubj' }}
          content={
            <FormattedMessage
              id="data.mgmt.searchSessions.table.versionIncompatibleWarning"
              defaultMessage="This background search was created in a Kibana instance running a different version. It may not restore correctly."
            />
          }
        />
      ) : null;

    return (
      <NameColumnText
        status={status}
        href={href}
        onClick={(event) => {
          if (hasActiveModifierKey(event)) return;
          if (navigateToUrl || onBackgroundSearchOpened) {
            event.preventDefault();
          }
          trackAction?.();
          navigateToUrl?.(href);
          onBackgroundSearchOpened?.({ session, event });
        }}
      >
        <TableText data-test-subj="sessionManagementNameCol">
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>{name}</EuiFlexItem>
            {notRestorableWarning && (
              <EuiFlexItem css={iconCss} grow={false}>
                {notRestorableWarning}
              </EuiFlexItem>
            )}
            {versionIncompatibleWarning && (
              <EuiFlexItem css={iconCss} grow={false}>
                {versionIncompatibleWarning}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </TableText>
      </NameColumnText>
    );
  },
});

const iconCss = css`
  line-height: 1;
`;
