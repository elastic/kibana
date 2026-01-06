/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana as useKibanaGeneric } from '@kbn/kibana-react-plugin/public';
import type { WorkflowsServices } from '../types';

/*
 * This is a simple wrapper around the generic `useKibana` hook that
 * provides the correct type for the `services` object.
 */
export const useKibana = useKibanaGeneric<WorkflowsServices>;
