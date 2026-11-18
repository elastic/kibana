/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiBodyEntry } from '@kbn/saved-objects-management-plugin/server';
import { transformIn, transformOut } from '../../common/api/transforms';
import type { StoredLinksState } from '../links_saved_object';
import type { LinksApiState } from '../types';
import { updateRequestBodySchema } from './update/schemas';

/** The `links` entry for Saved Objects Management's API body registry. */
export const linksApiBodyEntry: ApiBodyEntry<LinksApiState, StoredLinksState> = {
  getSchema: () => updateRequestBodySchema,
  // Same conversion as the public GET, with dashboard link destinations from the references.
  // Items saved through the API already hold the schema defaults the GET applies.
  toApi: ({ attributes, references }) => ({
    body: transformOut(attributes, references),
    warnings: [],
  }),
  // Same as the PUT route, which puts every dashboard link destination and tag into the references.
  toStored: (body) => {
    const { state, references } = transformIn(body);
    return { attributes: state, references };
  },
};
