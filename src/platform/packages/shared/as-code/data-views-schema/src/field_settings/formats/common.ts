/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const numeralPatternSchema = z
  .string()
  .meta({
    title: 'Format',
    description:
      'Numeral.js format pattern. See https://www.elastic.co/docs/explore-analyze/numeral-formatting to learn more.',
  })
  .optional();

export const momentPatternSchema = z
  .string()
  .meta({
    title: 'Format',
    description: 'Moment.js format pattern. See https://momentjs.com/ to learn more.',
  })
  .optional();
