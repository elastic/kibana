/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ActionDefinition, ContentEntry } from '../connector_spec';

const PAGE_TOKEN_MAX_LENGTH = 2048;

/** What a content-source connector supplies; `contentSourceActions` turns it into the three `context*` actions. */
export interface ContentSourceImpl {
  /** One page of a folder, as the connector names folders; empty is the top. */
  list: (
    ctx: ActionContext,
    input: { folder?: string; pageToken?: string }
  ) => Promise<{ entries: ContentEntry[]; nextPageToken?: string }>;
  /** One item as an entry; throws when the caller cannot see it. */
  getMetadata: (ctx: ActionContext, id: string) => Promise<ContentEntry>;
  /** The item's text, or undefined when it is not text or larger than `maxBytes`. */
  getContent: (
    ctx: ActionContext,
    input: { id: string; maxBytes?: number }
  ) => Promise<string | undefined>;
  /** The raw output of one of the connector's own list or search actions, as entries. */
  entriesOf: (data: unknown) => ContentEntry[];
}

/**
 * The `contextList`, `contextGetMetadata` and `contextGetContent` actions of a content source. Their shape is the same
 * for every connector; only the folder and id inputs differ, since each connector names them its own way.
 */
export const contentSourceActions = ({
  impl,
  folder,
  id,
}: {
  impl: ContentSourceImpl;
  /** The input for a folder (a factory, as schemas are built lazily). */
  folder: () => z.ZodType;
  /** The input for one item's id. */
  id: () => z.ZodType;
}): Record<'contextList' | 'contextGetMetadata' | 'contextGetContent', ActionDefinition> => ({
  contextList: {
    isTool: false,
    scope: 'read',
    description: 'List one page of a folder as content entries (used by connector memory).',
    input: lazySchema(() =>
      z.object({
        folder: folder(),
        pageToken: z
          .string()
          .max(PAGE_TOKEN_MAX_LENGTH)
          .optional()
          .describe('The nextPageToken of the previous page.'),
      })
    ),
    handler: (ctx, input) => impl.list(ctx, input as { folder?: string; pageToken?: string }),
  },

  contextGetMetadata: {
    isTool: false,
    scope: 'read',
    description: 'Get one item as a content entry; fails when the caller cannot see it.',
    input: lazySchema(() => z.object({ id: id() })),
    handler: (ctx, input) => impl.getMetadata(ctx, (input as { id: string }).id),
  },

  contextGetContent: {
    isTool: false,
    scope: 'read',
    description: 'Read an item as text; returns no text for binary or oversized items.',
    input: lazySchema(() =>
      z.object({
        id: id(),
        maxBytes: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Return no text when the item is larger than this.'),
      })
    ),
    handler: async (ctx, input) => {
      const text = await impl.getContent(ctx, input as { id: string; maxBytes?: number });
      return text === undefined ? {} : { text };
    },
  },
});
