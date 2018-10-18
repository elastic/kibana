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

import { Server } from '..';

interface AlertCondition {
  name: string;
  runnable(params: any): boolean;
}

export class AlertService {
  private conditions: AlertCondition[] = [];
  private condMap: any = {};
  private alerts: any = {};

  constructor(server: Server) {
    // tslint:disable-next-line:no-unused-expression
    server.router('/api/alerts',
      handler(req, resp) => {
        resp.reply("Hello");
      }
    )
  }

  public registerCondition(cond: AlertCondition) {
    this.conditions.push(cond);
    this.condMap[cond.name] = cond;
  }

  public registerAlert(condName: string, params: any): string {
    const guid = 'abc';
    this.alerts[guid] = {
      condition: this.condMap[condName],
      params,
    };

    /* create task */
    return guid;
  }

  public async start() {
    return {
      registerCondition: this.registerCondition,
    };
  }
}
