/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { NoDataCardProps } from '@kbn/shared-ux-card-no-data';
import { NoDataCard } from '@kbn/shared-ux-card-no-data';
import type { ActionCardProps } from '@kbn/shared-ux-page-no-data-types';

export type NoDataPageActions = NoDataCardProps;

export const KEY_ELASTIC_AGENT = 'elasticAgent';

const getActionKey = (actionKey: string) =>
  actionKey === KEY_ELASTIC_AGENT ? 'empty-page-agent-action' : `empty-page-${actionKey}-action`;

export const ActionCard = ({ action }: ActionCardProps) => {
  const actionKeys = Object.keys(action);

  if (actionKeys.length === 0) {
    return null;
  }

  if (actionKeys.length === 1) {
    const actionKey = actionKeys[0];
    return <NoDataCard key={getActionKey(actionKey)} {...action[actionKey]} />;
  }

  return (
    <EuiFlexGroup gutterSize="l" justifyContent="center" wrap>
      {actionKeys.map((actionKey) => (
        <EuiFlexItem key={getActionKey(actionKey)} grow={false}>
          <NoDataCard {...action[actionKey]} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
