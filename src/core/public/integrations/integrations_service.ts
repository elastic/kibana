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

import { IUiSettingsClient } from '../ui_settings';
import { CoreService } from '../../types';

import { MomentService } from './moment';
import { StylesService } from './styles';

interface Deps {
  uiSettings: IUiSettingsClient;
}

/** @internal */
export class IntegrationsService implements CoreService {
  private readonly styles = new StylesService();
  private readonly moment = new MomentService();

  public async setup() {
    await this.styles.setup();
    await this.moment.setup();
  }

  public async start({ uiSettings }: Deps) {
    await this.styles.start({ uiSettings });
    await this.moment.start({ uiSettings });
  }

  public async stop() {
    await this.styles.stop();
    await this.moment.stop();
  }
}
