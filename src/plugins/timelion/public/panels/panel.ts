/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

interface PanelConfig {
  help?: string;
  render?: Function;
}

export class Panel {
  name: string;
  help: string;
  render: Function | undefined;

  constructor(name: string, config: PanelConfig) {
    this.name = name;
    this.help = config.help || '';
    this.render = config.render;

    if (!config.render) {
      throw new Error(
        i18n.translate('timelion.panels.noRenderFunctionErrorMessage', {
          defaultMessage: 'Panel must have a rendering function',
        })
      );
    }
  }
}
