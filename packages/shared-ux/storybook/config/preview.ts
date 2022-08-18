/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-namespace,@typescript-eslint/no-empty-interface */
declare global {
  namespace NodeJS {
    interface Global {}
    interface InspectOptions {}
    type ConsoleConstructor = console.ConsoleConstructor;
  }
}
/* eslint-enable */

import jest from 'jest-mock';
/* @ts-expect-error TS doesn't see jest as a property of window, and I don't want to edit our global config. */
window.jest = jest;
