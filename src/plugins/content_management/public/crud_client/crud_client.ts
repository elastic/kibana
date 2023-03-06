/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GetIn, CreateIn, UpdateIn, DeleteIn, SearchIn } from '../../common';

export interface CrudClient {
  get(input: GetIn): Promise<unknown>;
  create(input: CreateIn): Promise<unknown>;
  update(input: UpdateIn): Promise<unknown>;
  delete(input: DeleteIn): Promise<unknown>;
  search(input: SearchIn): Promise<unknown>;
}
