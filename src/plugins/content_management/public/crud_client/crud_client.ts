/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { GetIn, CreateIn } from '../../common';

export interface CrudClient {
  get<I extends GetIn = GetIn, O = unknown>(input: I): Promise<O>;
  create<I extends CreateIn = CreateIn, O = unknown>(input: I): Promise<O>;
}
