/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext } from 'react';
import type { ExternalServices } from '../../types';
import { ExternalServicesContext } from './external_services_context';

/**
 * Returns the host-injected `ExternalServices`, or `undefined` when no provider
 * is mounted (or when the host did not pass services). Consumers should treat
 * `undefined` as "feature unavailable" and degrade gracefully.
 */
export const useExternalServices = (): ExternalServices | undefined =>
  useContext(ExternalServicesContext);
