/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RedirectOptions } from '../redirect_manager';

export function formatSearchParams(opts: RedirectOptions): URLSearchParams {
  const searchParams = new URLSearchParams();

  searchParams.set('l', opts.id);
  searchParams.set('v', opts.version);
  searchParams.set('p', JSON.stringify(opts.params));

  return searchParams;
}
