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
  EuiAccordion,
  EuiBadge,
  EuiCode,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type {
  RetrievedServiceAccount,
  ServiceAccountAssumableBy,
  ServiceAccountCreator,
} from '../../common/types';

export type DirectoryAccount = Omit<RetrievedServiceAccount, 'creator'> & {
  creator?: ServiceAccountCreator;
};

const CreatorDescription = ({ creator }: { creator: ServiceAccountCreator }) => {
  if (creator.type === 'user') {
    const displayName = [creator.first_name, creator.last_name].filter(Boolean).join(' ');
    return (
      <EuiText size="s">
        <p>
          <EuiBadge>User</EuiBadge>
          {displayName ? ` ${displayName}` : ''}
        </p>
        <p>
          User id: <EuiCode>{creator.id}</EuiCode>
        </p>
      </EuiText>
    );
  }

  return (
    <EuiText size="s">
      <p>
        <EuiBadge>API key</EuiBadge>
        {creator.description ? ` ${creator.description}` : ''}
      </p>
      <p>
        Key id: <EuiCode>{creator.id}</EuiCode>
      </p>
    </EuiText>
  );
};

const AssumableByDescription = ({ entries }: { entries: ServiceAccountAssumableBy[] }) => {
  if (entries.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <p>None</p>
      </EuiText>
    );
  }

  return (
    <>
      {entries.map((entry, index) => (
        <EuiText size="s" key={`${entry.project_id ?? entry.organization_id ?? index}`}>
          <p>
            <EuiBadge>{entry.type || 'principal'}</EuiBadge>
          </p>
          {entry.organization_id && (
            <p>
              Organization: <EuiCode>{entry.organization_id}</EuiCode>
            </p>
          )}
          {(entry.project_type || entry.project_id) && (
            <p>
              Project: {entry.project_type ? `${entry.project_type} / ` : ''}
              <EuiCode>{entry.project_id ?? '—'}</EuiCode>
            </p>
          )}
        </EuiText>
      ))}
    </>
  );
};

export const ServiceAccountCard = ({
  account,
  badge,
}: {
  account: DirectoryAccount;
  badge?: string;
}) => {
  const roleAssignments = account.role_assignments ?? {};
  const hasRoleAssignments = Object.keys(roleAssignments).length > 0;

  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xs">
            <h3>{account.name}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {badge && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{badge}</EuiBadge>
          </EuiFlexItem>
        )}
        {account.type && (
          <EuiFlexItem grow={false}>
            <EuiBadge>{account.type}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        compressed
        listItems={[
          {
            title: 'Id',
            description: <EuiCode>{account.id}</EuiCode>,
          },
          ...(account.organization_id
            ? [
                {
                  title: 'Organization',
                  description: <EuiCode>{account.organization_id}</EuiCode>,
                },
              ]
            : []),
          {
            title: 'Created by',
            description: account.creator ? (
              <CreatorDescription creator={account.creator} />
            ) : (
              <EuiText size="s" color="subdued">
                <p>Not included on create. Look up this id to see the creator.</p>
              </EuiText>
            ),
          },
          {
            title: 'Assumable by',
            description: (
              <AssumableByDescription
                entries={Array.isArray(account.assumable_by) ? account.assumable_by : []}
              />
            ),
          },
        ]}
      />
      <EuiSpacer size="s" />
      <EuiAccordion
        id={`sa-example-roles-${account.id}`}
        buttonContent="Role assignments"
        initialIsOpen={false}
      >
        <EuiSpacer size="s" />
        {hasRoleAssignments ? (
          <EuiCodeBlock language="json" overflowHeight={200} isCopyable>
            {JSON.stringify(roleAssignments, null, 2)}
          </EuiCodeBlock>
        ) : (
          <EuiText size="s" color="subdued">
            <p>None</p>
          </EuiText>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};
