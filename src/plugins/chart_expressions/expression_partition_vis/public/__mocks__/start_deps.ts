/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from } from 'rxjs';
import { action } from '@storybook/addon-actions';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getFormatService } from './format_service';
import { palettes } from './palettes';
import { theme } from './theme';
import { VisTypePieDependencies } from '../plugin';

const data = {
  actions: {
    createFiltersFromValueClickAction: action('createFiltersFromValueClickAction'),
    createFiltersFromRangeSelectAction: action('createFiltersFromRangeSelectAction'),
  },
} as DataPublicPluginStart;

export const getStartDeps = (() => ({
  data,
  fieldFormats: getFormatService() as FieldFormatsStart,
  core: {
    theme: {
      theme$: from([{ darkMode: false }]),
    },
  },
  plugins: {
    data,
    fieldFormats: getFormatService() as FieldFormatsStart,
    charts: {
      theme,
      palettes,
    },
  },
})) as unknown as VisTypePieDependencies['getStartDeps'];
