/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext, Logger } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { TimelionConfigType } from './config';
import { timelionSheetSavedObjectType } from './saved_objects';

/**
 * Deprecated since 7.0, the Timelion app will be removed in 8.0.
 * To continue using your Timelion worksheets, migrate them to a dashboard.
 *
 *  @link https://www.elastic.co/guide/en/kibana/master/timelion.html#timelion-deprecation
 **/
const showWarningMessageIfTimelionSheetWasFound = (core: CoreStart, logger: Logger) => {
  const { savedObjects } = core;
  const savedObjectsClient = savedObjects.createInternalRepository();

  savedObjectsClient
    .find({
      type: 'timelion-sheet',
      perPage: 1,
    })
    .then(
      ({ total }) =>
        total &&
        logger.warn(
          'Deprecated since 7.0, the Timelion app will be removed in 8.0. To continue using your Timelion worksheets, migrate them to a dashboard. See https://www.elastic.co/guide/en/kibana/master/dashboard.html#timelion-deprecation.'
        )
    );
};

export class TimelionPlugin implements Plugin {
  private logger: Logger;

  constructor(context: PluginInitializerContext<TimelionConfigType>) {
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup) {
    core.capabilities.registerProvider(() => ({
      timelion: {
        save: true,
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
  }
  start(core: CoreStart) {
    showWarningMessageIfTimelionSheetWasFound(core, this.logger);
  }
  stop() {}
}
