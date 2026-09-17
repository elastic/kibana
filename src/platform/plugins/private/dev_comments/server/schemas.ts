/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { isSafeRelativePath, routeFromLocation, type CommentRoute } from '../common';

/** Most comments stored, and so listed or exported at once. */
export const MAX_COMMENTS = 1000;
/** Most replies on one comment. */
export const REPLIES_MAX = 200;
/** Id of the document in the comments index that holds the comment count; never a comment id. */
export const QUOTA_ID = 'quota';

const TEXT_MAX_LENGTH = 5000;
const SELECTOR_MAX_LENGTH = 1000;
const TRAIL_MAX_STEPS = 25;
const SNAPSHOT_MAX_BYTES = 300_000;
const ID_MAX_LENGTH = 64;
const TIMESTAMP_MAX_LENGTH = 64;
const NAME_MAX_LENGTH = 256;
const PATH_MAX_LENGTH = 8192;
const MAX_LOCATORS = 10;
const MAX_IMAGE_DIMENSION = 10_000;
/** Base64 expands the byte budget by 4/3 plus padding. */
const SNAPSHOT_IMAGE_MAX_LENGTH = Math.ceil((SNAPSHOT_MAX_BYTES * 4) / 3) + 4;

/** What Elasticsearch's default `date` format accepts, so that a bad timestamp is a validation error rather than a failed write. */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

const idSchema = schema.string({
  minLength: 1,
  maxLength: ID_MAX_LENGTH,
  validate: (id) => (id === QUOTA_ID ? `[${QUOTA_ID}] is reserved` : undefined),
});
const timestampSchema = schema.string({
  minLength: 1,
  maxLength: TIMESTAMP_MAX_LENGTH,
  validate: (value) =>
    ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value))
      ? undefined
      : 'must be an ISO 8601 timestamp',
});
const nameSchema = schema.string({ minLength: 1, maxLength: NAME_MAX_LENGTH });
const selectorSchema = schema.string({ minLength: 1, maxLength: SELECTOR_MAX_LENGTH });
const textSchema = schema.string({ minLength: 1, maxLength: TEXT_MAX_LENGTH });
const relativeOffsetSchema = schema.number({ min: 0, max: 1 });
const pathSchema = schema.string({
  minLength: 1,
  maxLength: PATH_MAX_LENGTH,
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
  locators: schema.arrayOf(locatorSchema, { minSize: 1, maxSize: MAX_LOCATORS }),
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

const snapshotSchema = schema.object({
  mimeType: schema.literal('image/jpeg'),
  width: schema.number({ min: 1, max: MAX_IMAGE_DIMENSION }),
  height: schema.number({ min: 1, max: MAX_IMAGE_DIMENSION }),
  image: schema.maybe(schema.string({ maxLength: SNAPSHOT_IMAGE_MAX_LENGTH })),
});

const replySchema = schema.object({
  id: idSchema,
  author: authorSchema,
  text: textSchema,
  createdAt: timestampSchema,
});

const routeSchema = schema.object({
  pageKey: schema.string({ minLength: 1, maxLength: PATH_MAX_LENGTH }),
  path: pathSchema,
});

/** Route as stored by the first version of the layer: base-path-free pathname plus the absolute URL. */
export interface LegacyRoute {
  pathname: string;
  url: string;
}

/** Rewrites a first-version route; the pathname alone identifies the page when the URL cannot be parsed. */
export const routeFromLegacy = ({ pathname, url }: LegacyRoute): CommentRoute => {
  try {
    const { search, hash } = new URL(url);
    return routeFromLocation({ pathname, search, hash });
  } catch {
    return { pageKey: pathname, path: pathname };
  }
};

export const normalizeRoute = (route: CommentRoute | LegacyRoute): CommentRoute =>
  'pageKey' in route ? route : routeFromLegacy(route);

export const newCommentSchema = schema.object({
  author: authorSchema,
  text: textSchema,
  resolved: schema.boolean(),
  replies: schema.arrayOf(replySchema, { maxSize: REPLIES_MAX }),
  route: routeSchema,
  anchor: anchorSchema,
  trail: schema.arrayOf(schema.object({ anchor: anchorSchema, label: nameSchema }), {
    maxSize: TRAIL_MAX_STEPS,
  }),
  snapshot: schema.maybe(snapshotSchema),
});

export const commentPatchSchema = schema.object({
  resolved: schema.maybe(schema.boolean()),
  reply: schema.maybe(schema.object({ author: authorSchema, text: textSchema })),
});

export const idParamsSchema = schema.object({ id: idSchema });
