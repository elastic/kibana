/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { JobLastRun, SerializedUser } from '../../common/types';

const UserBlock = ({ user }: { user: SerializedUser | null | undefined }) => {
  if (!user) {
    return (
      <EuiText size="s" color="subdued">
        <p>No authenticated user on this path.</p>
      </EuiText>
    );
  }

  return (
    <EuiText size="s">
      <p>
        <strong>{user.username}</strong>
      </p>
      <p>roles: {user.roles.join(', ') || '—'}</p>
      {user.authentication_type && <p>auth type: {user.authentication_type}</p>}
      {user.authentication_realm && (
        <p>
          realm: {user.authentication_realm.name} ({user.authentication_realm.type})
        </p>
      )}
    </EuiText>
  );
};

const Card = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <EuiPanel paddingSize="m" hasBorder>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiText size="s" color="subdued">
      <p>{subtitle}</p>
    </EuiText>
    <EuiSpacer size="s" />
    {children}
  </EuiPanel>
);

export const IdentityCards = ({
  you,
  lastRun,
}: {
  you: SerializedUser | null;
  lastRun?: JobLastRun;
}) => {
  return (
    <>
      <EuiTitle size="s">
        <h2>Identity comparison</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <Card title="You" subtitle="Current browser session (whoami)">
            <UserBlock user={you} />
          </Card>
        </EuiFlexItem>
        <EuiFlexItem>
          <Card
            title="Scoped request"
            subtitle="handle.withScopedRequest → ES _security/_authenticate + getCurrentUser"
          >
            {!lastRun && (
              <EuiText size="s" color="subdued">
                <p>Run the job to populate this card.</p>
              </EuiText>
            )}
            {lastRun?.scoped.error && <EuiBadge color="danger">{lastRun.scoped.error}</EuiBadge>}
            {lastRun && !lastRun.scoped.error && (
              <>
                <UserBlock user={lastRun.scoped.kibanaUser} />
                {lastRun.scoped.esAuthenticateError && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiBadge color="warning">ES authenticate failed</EuiBadge>
                    <EuiText size="s">
                      <p>{lastRun.scoped.esAuthenticateError}</p>
                    </EuiText>
                  </>
                )}
                {lastRun.scoped.esAuthenticate != null && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiCodeBlock language="json" overflowHeight={200} isCopyable>
                      {JSON.stringify(lastRun.scoped.esAuthenticate, null, 2)}
                    </EuiCodeBlock>
                  </>
                )}
              </>
            )}
          </Card>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
