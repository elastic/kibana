/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup } from 'src/core/public';
import { deserializeFieldFormat } from './utils/deserialize';
import { baseFormattersPublic } from './constants';
import { DataPublicPluginStart, fieldFormats } from '..';

export const getFieldFormatsRegistry = (core: CoreSetup) => {
  const fieldFormatsRegistry = new fieldFormats.FieldFormatsRegistry();
  const getConfig = core.uiSettings.get.bind(core.uiSettings);

  fieldFormatsRegistry.init(getConfig, {}, baseFormattersPublic);

  fieldFormatsRegistry.deserialize = deserializeFieldFormat.bind(
    fieldFormatsRegistry as DataPublicPluginStart['fieldFormats']
  );

  return fieldFormatsRegistry;
};
