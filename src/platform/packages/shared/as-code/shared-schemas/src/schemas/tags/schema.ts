/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { MAX_ID_LENGTH } from '../../constants';

export const MAX_TAG_C0UNT = 1_000;

export const getAsCodeTagsSchema = (customDescrption?: string, customMaxSize?: number) =>
  z
    .array(z.string().max(MAX_ID_LENGTH))
    .max(customMaxSize ?? MAX_TAG_C0UNT)
    .default([])
    .meta({ description: customDescrption ?? 'Tag IDs associated with this library item.' });
