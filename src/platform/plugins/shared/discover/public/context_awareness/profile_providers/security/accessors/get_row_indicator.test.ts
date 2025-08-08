/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getAlertEventRowIndicator } from './get_row_indicator';
import type { EuiThemeComputed } from '@elastic/eui';

describe('getAlertEventRowIndicator', () => {
  it('should return the correct color and label for an event row', () => {
    const row = {
      flattened: {
        'event.kind': 'event',
      },
    } as unknown as DataTableRecord;

    const euiTheme = {
      colors: {
        backgroundLightText: 'backgroundLightText',
      },
    } as const as EuiThemeComputed;

    const result = getAlertEventRowIndicator(row, euiTheme);

    expect(result).toEqual({
      color: 'backgroundLightText',
      label: 'event',
    });
  });

  it('should return the correct color and label for an alert row', () => {
    const row = {
      flattened: {
        'event.kind': 'signal',
      },
    } as unknown as DataTableRecord;

    const euiTheme = {
      colors: {
        backgroundLightText: 'backgroundLightText',
        warning: 'warning',
      },
    } as const as EuiThemeComputed;

    const result = getAlertEventRowIndicator(row, euiTheme);

    expect(result).toEqual({
      color: 'warning',
      label: 'alert',
    });
  });
});
