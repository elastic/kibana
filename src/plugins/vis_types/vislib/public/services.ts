/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ThemeServiceStart } from 'kibana/public';
import { createGetterSetter } from '../../../kibana_utils/public';
import { DataPublicPluginStart } from '../../../data/public';

export const [getDataActions, setDataActions] =
  createGetterSetter<DataPublicPluginStart['actions']>('vislib data.actions');

export const [getFormatService, setFormatService] = createGetterSetter<
  DataPublicPluginStart['fieldFormats']
>('vislib data.fieldFormats');

export const [getTheme, setTheme] = createGetterSetter<ThemeServiceStart>('vislib theme service');
