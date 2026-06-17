/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenConnectionDetailsParams } from './open_connection_details';
import { openConnectionDetails } from './open_connection_details';
import { getGlobalDependencies } from './global';

type OpenWiredConnectionDetailsProps = Omit<OpenConnectionDetailsParams['props'], 'start'>;
export type OpenWiredConnectionDetailsParams = Partial<
  Omit<{ props: OpenWiredConnectionDetailsProps }, 'start'>
>;

export const openWiredConnectionDetails = async (params: OpenWiredConnectionDetailsParams = {}) => {
  const start = getGlobalDependencies().start;

  return openConnectionDetails({
    ...params,
    props: {
      ...params.props,
      start,
    },
    start,
  });
};
