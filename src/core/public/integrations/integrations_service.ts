/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '../ui_settings';
import { CoreService } from '../../types';

import { MomentService } from './moment';
import { StylesService } from './styles';

export interface Deps {
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
