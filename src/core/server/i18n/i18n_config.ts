/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const config = {
  path: 'i18n',
  schema: schema.object({
    locale: schema.string({ defaultValue: 'en' }),
  }),
};

export type I18nConfigType = TypeOf<typeof config.schema>;
