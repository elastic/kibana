/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { AutocompleteInfo, Settings } from '../../../../services';

interface SetInitialValueParams {
  /** The Console autocomplete service. */
  autocompleteInfo: AutocompleteInfo;
  /** The Console settings service. */
  settingsService: Settings;
}

/**
 * Hook that sets up the autocomplete polling for Console editor.
 *
 * @param params The {@link SetInitialValueParams} to use.
 */
export const useSetupAutocompletePolling = (params: SetInitialValueParams) => {
  const { autocompleteInfo, settingsService } = params;

  useEffect(() => {
    autocompleteInfo.retrieve(settingsService, settingsService.getAutocomplete());

    return () => {
      autocompleteInfo.clearSubscriptions();
    };
  }, [autocompleteInfo, settingsService]);
};
