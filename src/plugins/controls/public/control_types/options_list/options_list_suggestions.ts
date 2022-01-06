/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pluginServices } from '../../services';
import { OptionsListSuggestionRequest, OptionsListSuggestionResponse } from './types';

const { http } = pluginServices.getServices();

export const getSuggestions = async (index: string, request: OptionsListSuggestionRequest) => {
  return await http.fetch<OptionsListSuggestionResponse>(
    `/api/kibana/controls/optionsList/${index}`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
};
