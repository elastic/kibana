/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { registerExampleFormat } from './examples/2_creating_custom_formatter';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class FieldFormatsExamplePlugin extends Service {
  static readonly inject = ['fieldFormats.setup'];
  static readonly provide = 'fieldFormatsExample';

  constructor(ctx: Context) {
    super(ctx, 'fieldFormatsExample');
    const deps = {
    fieldFormats: (ctx.get('fieldFormats.setup') as any).contract,
    };
    registerExampleFormat(deps.fieldFormats);
  }
}
