/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type PathsOf, type TypeOf, useParams } from '@kbn/typed-react-router-config';
import type { AIAssistantManagementObservabilityRoutes } from '../routes/config';

export function useObservabilityAIAssistantManagementRouterParams<
  TPath extends PathsOf<AIAssistantManagementObservabilityRoutes>
>(path: TPath): TypeOf<AIAssistantManagementObservabilityRoutes, TPath> {
  return useParams(path)! as TypeOf<AIAssistantManagementObservabilityRoutes, TPath>;
}
