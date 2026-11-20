/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * pdfmake depends on pdfkit, which cannot load under jsdom: its browser build is ESM-only,
 * and its CommonJS build calls `createRequire` with a URL derived from `document`.
 *
 * Kibana only calls pdfmake inside the screenshotting PDF worker thread, which runs outside
 * Jest's module registry. On the main thread the screenshotting plugin imports pdfmake
 * without using it, which is what any jsdom test that sets up every plugin hits.
 *
 * Under jsdom, pdfmake resolves to a stub that can be imported but throws on use. Tests that
 * need the real pdfmake must run in the node environment (`@jest-environment node`).
 */

const PASS_THROUGH_KEYS = new Set(['__esModule', 'then', 'asymmetricMatch', '$$typeof']);

const createPdfmakeStub = () =>
  new Proxy(
    {},
    {
      get(target, key) {
        if (typeof key === 'symbol' || PASS_THROUGH_KEYS.has(key)) {
          return undefined;
        }
        throw new Error(
          `pdfmake is stubbed under jsdom because pdfkit cannot load there (accessed "${key}"). ` +
            'Add a `@jest-environment node` docblock to tests that use pdfmake.'
        );
      },
    }
  );

jest.mock('pdfmake', () =>
  typeof document === 'undefined' ? jest.requireActual('pdfmake') : createPdfmakeStub()
);
