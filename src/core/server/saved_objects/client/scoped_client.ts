/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Context } from '../types/context';
import { BaseClient } from './base_client';

export class ScopedClient {
  constructor(
    private readonly client: BaseClient,
    private readonly context: Context
  ) {}

  /**
   * Forward calls to the internal base client.
   *
   * @param action     CRUD action of the saved objects client
   */

  public call(action: string): any {
    // TODO: implement call method on saved objects client
    // that forwards to the right method
    return this.client.call(action, this.context);
  }
}
