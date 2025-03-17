/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class ErrorPageObject extends FtrService {
  private readonly common = this.ctx.getPageObject('common');

  public async expectForbidden() {
    const messageText = await this.common.getBodyText();
    expect(messageText).to.contain('You do not have permission to access the requested page');
  }

  public async expectNotFound() {
    const messageText = await this.common.getJsonBodyText();
    expect(messageText).to.eql(
      JSON.stringify({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      })
    );
  }
}
