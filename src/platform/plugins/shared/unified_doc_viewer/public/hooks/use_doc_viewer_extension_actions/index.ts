/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import createContainer from 'constate';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';

interface UseDocViewerExtensionActionsParams {
  actions?: DocViewRenderProps['actions'];
}

const useDocViewerExtensionActions = ({ actions }: UseDocViewerExtensionActionsParams) => {
  return actions ?? undefined;
};

export const [DocViewerExtensionActionsProvider, useDocViewerExtensionActionsContext] =
  createContainer(useDocViewerExtensionActions);
