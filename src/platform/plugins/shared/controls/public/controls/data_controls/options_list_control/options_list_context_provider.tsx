/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext, useMemo } from 'react';
import { initializeStateManager } from '@kbn/presentation-publishing';
import type { OptionsListDisplaySettings } from '../../../../common/options_list';
import { type OptionsListComponentApi, type PartialOptionsListComponentApi } from './types';

interface OptionsListControlContextType {
  componentApi: OptionsListComponentApi;
  displaySettings: OptionsListDisplaySettings;
}

const OptionsListControlContext = React.createContext<OptionsListControlContextType | undefined>(
  undefined
);

export const useOptionsListContext = () => {
  const optionsListContext = useContext(OptionsListControlContext);
  if (!optionsListContext)
    throw new Error(
      'No OptionsListControlContext.Provider found when calling useOptionsListContext.'
    );
  return optionsListContext;
};

type OptionsListControlContextInputProps = OptionsListDisplaySettings & {
  componentApi: PartialOptionsListComponentApi;
  disableLoadSuggestions?: boolean;
  disableMultiSelect?: boolean;
  disableInvalidSelections?: boolean;
};

const infillStateApi = (defaultState: any) =>
  initializeStateManager(defaultState, defaultState).api;

export const OptionsListControlContextProvider: React.FC<
  React.PropsWithChildren<OptionsListControlContextInputProps>
> = ({
  componentApi,
  disableLoadSuggestions,
  disableMultiSelect,
  disableInvalidSelections,
  children,
  ...displaySettings
}) => {
  const infilledComponentApi = useMemo(() => {
    const api = { ...componentApi };

    if (!Object.hasOwn(componentApi, 'exclude$') || displaySettings.hideExclude) {
      if (!displaySettings.hideExclude)
        throw new Error('Options list without hideExclude must include exclude API');

      Object.assign(api, infillStateApi({ exclude: false }));
    }

    if (!Object.hasOwn(componentApi, 'existsSelected$')) {
      if (!displaySettings.hideExists)
        throw new Error('Options list without hideExists must include existsSelected API');

      Object.assign(api, infillStateApi({ existsSelected: false }));
    }

    if (!Object.hasOwn(componentApi, 'sort$')) {
      if (!displaySettings.hideSort)
        throw new Error('Options list without hideSort must include sort API');

      Object.assign(api, infillStateApi({ sort: undefined }));
    }

    if (
      disableLoadSuggestions ||
      !Object.hasOwn(componentApi, 'dataLoading$') ||
      !Object.hasOwn(componentApi, 'requestSize$') ||
      !Object.hasOwn(componentApi, 'runPastTimeout$')
    ) {
      if (!disableLoadSuggestions)
        throw new Error(
          'Options list without disableLoadSuggestions must include loading suggestions API'
        );
      Object.assign(
        api,
        infillStateApi({
          requestSize: 0,
          dataLoading: false,
          runPastTimeout: false,
        })
      );
    }

    if (disableMultiSelect || !Object.hasOwn(componentApi, 'singleSelect$')) {
      if (!disableMultiSelect)
        throw new Error('Options list without disableMultiSelect must include singleSelect API');

      Object.assign(api, infillStateApi({ singleSelect: true }));
    }

    if (disableInvalidSelections || !Object.hasOwn(componentApi, 'invalidSelections$')) {
      if (!disableInvalidSelections)
        throw new Error(
          'Options list without disableInvalidSelections must include invalidSelections API'
        );

      Object.assign(api, infillStateApi({ invalidSelections: new Set() }));
    }

    return api;
  }, [
    componentApi,
    disableLoadSuggestions,
    disableMultiSelect,
    disableInvalidSelections,
    displaySettings,
  ]);

  const contextValue = useMemo(
    () => ({
      componentApi: infilledComponentApi as OptionsListComponentApi,
      displaySettings,
    }),
    [infilledComponentApi, displaySettings]
  );
  return (
    <OptionsListControlContext.Provider value={contextValue}>
      {children}
    </OptionsListControlContext.Provider>
  );
};
