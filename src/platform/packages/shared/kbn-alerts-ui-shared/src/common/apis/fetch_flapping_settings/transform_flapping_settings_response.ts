/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AsApiContract } from '@kbn/actions-types';
import { RulesSettingsFlapping } from '@kbn/alerting-types';

export const transformFlappingSettingsResponse = ({
  look_back_window: lookBackWindow,
  status_change_threshold: statusChangeThreshold,
  created_at: createdAt,
  created_by: createdBy,
  updated_at: updatedAt,
  updated_by: updatedBy,
  ...rest
}: AsApiContract<RulesSettingsFlapping>): RulesSettingsFlapping => ({
  ...rest,
  lookBackWindow,
  statusChangeThreshold,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
});
