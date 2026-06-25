/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import semver from 'semver';
import { z } from '@kbn/zod/v4';
import { InstallFormSchema } from './install_form';

const semverString = z.string().refine((value) => semver.valid(value) !== null, {
  message: 'Must be a valid semver string (e.g. 1.0.0).',
});

const semverRangeString = z.string().refine((value) => semver.validRange(value) !== null, {
  message: 'Must be a valid semver range (e.g. ">=9.5.0 <9.6.0").',
});

/**
 * Schema for the `template-metadata` block parsed out of a template YAML file.
 */
export const TemplateMetadataSchema = z
  .object({
    slug: z
      .string()
      .regex(
        /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
        'Slug must be lowercase, alphanumeric, and dash-separated.'
      ),
    version: semverString,
    availability: semverRangeString,
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(500),
    solutions: z.array(z.string().min(1)).optional(),
    // Closed vocabulary is enforced by the catalog generator in the source repo.
    categories: z.array(z.string().min(1)).min(1, 'At least one category is required.'),
    install: InstallFormSchema.optional(),
  })
  .strict();
