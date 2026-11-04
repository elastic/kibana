/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { otelLog } from '.';

describe('otelLog', () => {
  it('sets the event name', () => {
    const [doc] = otelLog.create().eventName('browser.navigation').serialize();

    expect(doc.event_name).toBe('browser.navigation');
  });

  it('sets the severity number and optional severity text', () => {
    const [withText] = otelLog.create().severity(17, 'ERROR').serialize();
    const [withoutText] = otelLog.create().severity(9).serialize();

    expect(withText).toMatchObject({ severity_number: 17, severity_text: 'ERROR' });
    expect(withoutText.severity_number).toBe(9);
    expect(withoutText).not.toHaveProperty('severity_text');
  });

  it('sets the instrumentation scope', () => {
    const [doc] = otelLog
      .create()
      .scope({ name: '@opentelemetry/browser-instrumentation/web-vitals', version: '0.1.0' })
      .serialize();

    expect(doc.scope).toEqual({
      name: '@opentelemetry/browser-instrumentation/web-vitals',
      version: '0.1.0',
    });
  });
});
