/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import createContainer from 'constate';
import type { DocViewerExtensionParams } from '@kbn/discover-plugin/public/context_awareness/types';

interface UseDocViewerExtensionActionsParams {
  actions?: DocViewerExtensionParams['actions'];
}

const useDocViewerExtensionActions = ({ actions }: UseDocViewerExtensionActionsParams) => {
  return actions ?? undefined;
};

export const [DocViewerExtensionActionsProvider, useDocViewerExtensionActionsContext] =
  createContainer(useDocViewerExtensionActions);
