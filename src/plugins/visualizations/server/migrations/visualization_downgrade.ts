/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// this function should be updated every time a new migration is added
// and must do the reverse: downgrade the newest saved object to previous version
export const downgrade = (visState: any) => {
  return visState;
};
