/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// Satisfy TS's requirements that the module be declared per './index.ts'.
declare module '!!raw-loader!./worker.js' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}
