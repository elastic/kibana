/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core/public';

export function xaxisFormatterProvider(config: IUiSettingsClient) {
  function getFormat(esInterval: any) {
    const parts = esInterval.match(/(\d+)(ms|s|m|h|d|w|M|y|)/);

    if (parts === null || parts[1] === null || parts[2] === null) {
      throw new Error(
        i18n.translate('timelion.panels.timechart.unknownIntervalErrorMessage', {
          defaultMessage: 'Unknown interval',
        })
      );
    }

    const interval = moment.duration(Number(parts[1]), parts[2]);

    // Cribbed from Kibana's TimeBuckets class
    const rules = config.get('dateFormat:scaled');

    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (!rule[0] || interval >= moment.duration(rule[0])) {
        return rule[1];
      }
    }

    return config.get('dateFormat');
  }

  return (esInterval: any) => getFormat(esInterval);
}
