/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';

export type PuppeteerRelease = string;
export type ChromeVersion = string;
export type ChromiumCommit = string;

export type PuppeteerPackageType = TypeOf<typeof PuppeteerPackageSchema>;
export type ChromiumDashVersionType = TypeOf<typeof ChromiumDashVersionSchema>;

export const PuppeteerPackageSchema = schema.object({
  version: schema.string(),
});

export const ChromiumDashVersionSchema = schema.object({
  chromium_main_branch_position: schema.number(),
  hashes: schema.object({
    chromium: schema.string({ minLength: 40, maxLength: 40 }),
  }),
});

// We forked the Puppeteer node module for Kibana,
// So we need to translate OUR version to the official Puppeteer Release
export const forkCompatibilityMap: Record<string, PuppeteerRelease> = {
  '5.4.1-patch.1': '5.4.1',
};
