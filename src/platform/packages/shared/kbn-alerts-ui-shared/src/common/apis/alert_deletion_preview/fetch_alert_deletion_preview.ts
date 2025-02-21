/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-types';
import type { AlertDeletionPreview } from '@kbn/alerting-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export const fetchAlertDeletionPreview = async ({ http }: { http: HttpSetup }) => {
  const res = await http.get<AsApiContract<AlertDeletionPreview>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/alert_deletion/preview`,
    {
      query: {
        is_active_alerts_deletion_enabled: true,
        is_inactive_alerts_deletion_enabled: true,
        active_alerts_deletion_threshold: 30,
        inactive_alerts_deletion_threshold: 90,
      },
    }
  );

  console.log({ res });

  return res;
};
