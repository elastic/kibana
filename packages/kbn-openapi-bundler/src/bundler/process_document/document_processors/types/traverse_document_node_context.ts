/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TraverseDocumentContext } from '../../types/context';
import { DocumentNode } from '../../types/node';

export type TraverseDocumentNodeContext = TraverseDocumentContext & {
  isRootNode: boolean;
  parentNode: DocumentNode;
  parentKey: string | number;
};
