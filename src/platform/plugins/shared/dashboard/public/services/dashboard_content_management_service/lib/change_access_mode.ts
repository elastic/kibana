/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_CONTENT_ID } from '../../../utils/telemetry_constants';
import { contentManagementService } from '../../kibana_services';
import type { ChangeAccessModeProps } from '../types';

export const changeAccessMode = async ({
  ids,
  accessMode,
}: ChangeAccessModeProps): Promise<void> => {
  const objects = ids.map((id) => ({
    type: DASHBOARD_CONTENT_ID,
    id,
  }));

  await contentManagementService.client.changeAccessMode({
    version: 1,
    objects,
    options: {
      accessMode,
    },
  });
};
