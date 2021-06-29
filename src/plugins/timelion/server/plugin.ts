/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext, Logger } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { TimelionConfigType } from './config';
import { timelionSheetSavedObjectType } from './saved_objects';
import { getDeprecations, showWarningMessageIfTimelionSheetWasFound } from './deprecations';

export class TimelionPlugin implements Plugin {
  private logger: Logger;

  constructor(context: PluginInitializerContext<TimelionConfigType>) {
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup) {
    core.capabilities.registerProvider(() => ({
      timelion: {
        save: true,
        show: true,
      },
    }));
    core.savedObjects.registerType(timelionSheetSavedObjectType);

    core.uiSettings.register({
      'timelion:showTutorial': {
        name: i18n.translate('timelion.uiSettings.showTutorialLabel', {
          defaultMessage: 'Show tutorial',
        }),
        value: false,
        description: i18n.translate('timelion.uiSettings.showTutorialDescription', {
          defaultMessage: 'Should I show the tutorial by default when entering the timelion app?',
        }),
        category: ['timelion'],
        schema: schema.boolean(),
      },
      'timelion:default_columns': {
        name: i18n.translate('timelion.uiSettings.defaultColumnsLabel', {
          defaultMessage: 'Default columns',
        }),
        value: 2,
        description: i18n.translate('timelion.uiSettings.defaultColumnsDescription', {
          defaultMessage: 'Number of columns on a timelion sheet by default',
        }),
        category: ['timelion'],
        schema: schema.number(),
      },
      'timelion:default_rows': {
        name: i18n.translate('timelion.uiSettings.defaultRowsLabel', {
          defaultMessage: 'Default rows',
        }),
        value: 2,
        description: i18n.translate('timelion.uiSettings.defaultRowsDescription', {
          defaultMessage: 'Number of rows on a timelion sheet by default',
        }),
        category: ['timelion'],
        schema: schema.number(),
      },
    });

    core.deprecations.registerDeprecations({ getDeprecations });
  }
  start(core: CoreStart) {
    showWarningMessageIfTimelionSheetWasFound(core, this.logger);
  }
  stop() {}
}
