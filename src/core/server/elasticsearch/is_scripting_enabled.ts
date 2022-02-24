/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from './client';

const scriptAllowedTypesKey = 'script.allowed_types';

export const isInlineScriptingEnabled = async ({
  client,
}: {
  client: ElasticsearchClient;
}): Promise<boolean> => {
  const settings = await client.cluster.getSettings({
    include_defaults: true,
    flat_settings: true,
  });

  // priority: transient -> persistent -> default
  const scriptAllowedTypes: string[] =
    settings.transient[scriptAllowedTypesKey] ??
    settings.persistent[scriptAllowedTypesKey] ??
    settings.defaults![scriptAllowedTypesKey] ??
    [];

  // when unspecified, the setting as a default `[]` value that means that both scriptings are allowed.
  return scriptAllowedTypes.length === 0 || scriptAllowedTypes.includes('inline');
};
