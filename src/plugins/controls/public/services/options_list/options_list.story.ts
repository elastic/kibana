/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { ControlsOptionsListService } from './types';
import { OptionsListRequest, OptionsListResponse } from '../../../common/options_list/types';

export type OptionsListServiceFactory = PluginServiceFactory<ControlsOptionsListService>;

let optionsListRequestMethod = async (request: OptionsListRequest, abortSignal: AbortSignal) =>
  new Promise<OptionsListResponse>((r) =>
    setTimeout(
      () =>
        r({
          suggestions: {},
          totalCardinality: 100,
          rejected: false,
        }),
      120
    )
  );

export const replaceOptionsListMethod = (
  newMethod: (request: OptionsListRequest, abortSignal: AbortSignal) => Promise<OptionsListResponse>
) => (optionsListRequestMethod = newMethod);

export const optionsListServiceFactory: OptionsListServiceFactory = () => {
  return {
    runOptionsListRequest: optionsListRequestMethod,
  };
};
