/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { NoDataCard, NoDataCardProps } from '@kbn/shared-ux-card-no-data';
import { ActionCardProps } from '@kbn/shared-ux-page-no-data-types';

export type NoDataPageActions = NoDataCardProps;

export const KEY_ELASTIC_AGENT = 'elasticAgent';

export const ActionCard = ({ action }: ActionCardProps) => {
  const actionKeys = Object.keys(action);

  if (actionKeys.length !== 1) {
    return null;
  }

  const actionKey = actionKeys[0];
  const key =
    actionKey === KEY_ELASTIC_AGENT ? 'empty-page-agent-action' : `empty-page-${actionKey}-action`;

  return <NoDataCard key={key} {...action[actionKey]} />;
};
