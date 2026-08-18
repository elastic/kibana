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
import { registerTodoContentType } from './examples/todos';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ContentManagementExamplesPlugin extends Service {
  static readonly inject = ['contentManagement.setup'];
  static readonly provide = 'contentManagementExamples';

  constructor(ctx: Context) {
    super(ctx, 'contentManagementExamples');
    const contentManagement = (ctx.get('contentManagement.setup') as any).contract;
    registerTodoContentType({ contentManagement });
  }
}
