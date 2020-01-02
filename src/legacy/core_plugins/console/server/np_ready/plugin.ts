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
import { Plugin, CoreSetup, CoreStart, HttpServiceSetup } from 'src/core/server';

import * as textObject from './api/text_object';

export class ConsoleServerPlugin implements Plugin<any, any, any> {
  private http: HttpServiceSetup | null = null;

  setup({ http }: CoreSetup, plugins: any) {
    this.http = http;
  }

  start({ savedObjects }: CoreStart) {
    const router = this.http!.createRouter();

    textObject.register(router, { savedObjectsService: savedObjects });
  }
  stop() {}
}
