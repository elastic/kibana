/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Context, useContext } from 'react';

export const createUseContext = <T>(Ctx: Context<T>, name: string) => {
  return () => {
    const ctx = useContext(Ctx);
    if (!ctx) {
      throw new Error(`${name} should be used inside of ${name}Provider!`);
    }
    return ctx;
  };
};
