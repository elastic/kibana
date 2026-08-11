/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as authTypeDefinitions from './src/all_auth_types';
import { BearerWithTlsAuth } from './src/auth_types/bearer_with_tls_server';
import { KubernetesAksAuth } from './src/auth_types/kubernetes_aks_server';
import { KubernetesEksAuth } from './src/auth_types/kubernetes_eks_server';
import { KubernetesGkeAuth } from './src/auth_types/kubernetes_gke_server';

export const authTypeSpecs = {
  ...authTypeDefinitions,
  BearerWithTlsAuth,
  KubernetesAksAuth,
  KubernetesEksAuth,
  KubernetesGkeAuth,
};
