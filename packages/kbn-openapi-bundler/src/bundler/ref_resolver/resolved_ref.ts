/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocumentNode } from '../process_document/types/node';
import { ResolvedDocument } from './resolved_document';

export interface ResolvedRef extends ResolvedDocument {
  /**
   * Parsed pointer without leading hash symbol (e.g. `/components/schemas/MySchema`)
   */
  pointer: string;

  /**
   * Resolved ref's node pointer points to
   */
  refNode: DocumentNode;
}
