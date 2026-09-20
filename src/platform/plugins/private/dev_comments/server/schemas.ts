/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { isSafeRelativePath } from '../common';

export const MAX_COMMENTS = 1000;
export const REPLIES_MAX = 200;

/** What Elasticsearch's default `date` format accepts, so that a bad timestamp is a validation error rather than a failed write. */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

const idSchema = schema.string({ minLength: 1, maxLength: 64 });
const timestampSchema = schema.string({
  minLength: 1,
  maxLength: 64,
  validate: (value) =>
    ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value))
      ? undefined
      : 'must be an ISO 8601 timestamp',
});
const nameSchema = schema.string({ minLength: 1, maxLength: 256 });
const selectorSchema = schema.string({ minLength: 1, maxLength: 1000 });
const textSchema = schema.string({ minLength: 1, maxLength: 5000 });
const relativeOffsetSchema = schema.number({ min: 0, max: 1 });
const pathSchema = schema.string({
  minLength: 1,
  maxLength: 8192,
  validate: (path) =>
    isSafeRelativePath(path) ? undefined : 'must be a path within this deployment',
});

const authorSchema = schema.object({ username: nameSchema, displayName: nameSchema });

const locatorSchema = schema.oneOf([
  schema.object({ type: schema.literal('testSubj'), path: selectorSchema }),
  schema.object({ type: schema.literal('id'), value: selectorSchema }),
  schema.object({ type: schema.literal('ariaLabel'), value: nameSchema }),
  schema.object({ type: schema.literal('text'), tag: nameSchema, value: nameSchema }),
  schema.object({
    type: schema.literal('cssPath'),
    selector: selectorSchema,
    fingerprint: nameSchema,
  }),
]);

const anchorSchema = schema.object({
  locators: schema.arrayOf(locatorSchema, { minSize: 1, maxSize: 10 }),
  relativeX: relativeOffsetSchema,
  relativeY: relativeOffsetSchema,
  target: schema.maybe(
    schema.object({
      path: selectorSchema,
      fingerprint: nameSchema,
      relativeX: relativeOffsetSchema,
      relativeY: relativeOffsetSchema,
    })
  ),
});

/** A screenshot as created: with its image, which only reads leave out (see `NewSnapshot`). Comments are never deleted, so one without could never be shown. */
const newSnapshotSchema = schema.object({
  mimeType: schema.literal('image/jpeg'),
  width: schema.number({ min: 1, max: 10_000 }),
  height: schema.number({ min: 1, max: 10_000 }),
  image: schema.string({ minLength: 1, maxLength: Math.ceil((300_000 * 4) / 3) + 4 }), // Base64 expands the byte budget by 4/3 plus padding.
});

const replySchema = schema.object({
  id: idSchema,
  author: authorSchema,
  text: textSchema,
  createdAt: timestampSchema,
});

const routeSchema = schema.object({
  pageKey: schema.string({ minLength: 1, maxLength: 8192 }),
  path: pathSchema,
});

export const newCommentSchema = schema.object({
  author: authorSchema,
  text: textSchema,
  resolved: schema.boolean(),
  replies: schema.arrayOf(replySchema, { maxSize: REPLIES_MAX }),
  route: routeSchema,
  anchor: anchorSchema,
  trail: schema.arrayOf(schema.object({ anchor: anchorSchema, label: nameSchema }), {
    maxSize: 25,
  }),
  snapshot: schema.maybe(newSnapshotSchema),
});

export const commentPatchSchema = schema.object({
  resolved: schema.maybe(schema.boolean()),
  reply: schema.maybe(schema.object({ author: authorSchema, text: textSchema })),
});

export const idParamsSchema = schema.object({ id: idSchema });
