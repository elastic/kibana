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
import { InstallFormSchemaSchema } from './install_form';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

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
    slug: z.string().regex(SLUG_REGEX, 'Slug must be lowercase, alphanumeric, and dash-separated.'),
    version: semverString,
    availability: semverRangeString,
    name: z.string().min(1),
    description: z.string().min(1),
    solutions: z.array(z.string()).optional(),
    categories: z.array(z.string()).nonempty('At least one category is required.'), // close-vocabulary is guaranteed by the catalog generator in the source repo
    icon: z.string().optional(),
    install: InstallFormSchemaSchema.optional(),
  })
  .loose();
