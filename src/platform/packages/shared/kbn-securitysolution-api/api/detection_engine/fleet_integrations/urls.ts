/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INTERNAL_DETECTION_ENGINE_URL as INTERNAL_URL } from '../../../constants';

export const GET_ALL_INTEGRATIONS_URL = `${INTERNAL_URL}/fleet/integrations/all` as const;

export const GET_INSTALLED_INTEGRATIONS_URL =
  `${INTERNAL_URL}/fleet/integrations/installed` as const;
