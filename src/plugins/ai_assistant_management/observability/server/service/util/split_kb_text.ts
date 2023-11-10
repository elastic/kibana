/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { merge } from 'lodash';
import type { KnowledgeBaseEntry } from '../../../common/types';
import { type KnowledgeBaseEntryOperation, KnowledgeBaseEntryOperationType } from '../kb_service';

export function splitKbText({
  id,
  texts,
  ...rest
}: Omit<KnowledgeBaseEntry, 'text'> & { texts: string[] }): KnowledgeBaseEntryOperation[] {
  return [
    {
      type: KnowledgeBaseEntryOperationType.Delete,
      labels: {
        document_id: id,
      },
    },
    ...texts.map((text, index) => ({
      type: KnowledgeBaseEntryOperationType.Index,
      document: merge({}, rest, {
        id: [id, index].join('_'),
        labels: {
          document_id: id,
        },
        text,
      }),
    })),
  ];
}
