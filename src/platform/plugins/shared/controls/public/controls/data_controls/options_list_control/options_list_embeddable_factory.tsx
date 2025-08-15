import { OptionsListControlState } from '@kbn/controls-plugin/common/options_list';
import { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { OptionsListControlApi } from './types';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import { getOptionsListControlFactory } from './get_options_list_control_factory';
import { SerializedPanelState } from '@kbn/presentation-publishing';
import React from 'react';

export type OptionsListEmbeddableApi = DefaultEmbeddableApi<OptionsListControlState> &
  OptionsListControlApi;

export const optionsListEmbeddableFactory: EmbeddableFactory<
  OptionsListControlState,
  OptionsListEmbeddableApi
> = {
  type: OPTIONS_LIST_CONTROL,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const { api: controlApi, Component } = await getOptionsListControlFactory().buildControl({
      initialState: initialState.rawState,
      finalizeApi: (apiRegistration) => {
        return apiRegistration as unknown as OptionsListControlApi;
      },
      uuid,
      parentApi,
    });
    const api = finalizeApi({
      ...controlApi,
      serializeState: () =>
        controlApi.serializeState() as SerializedPanelState<OptionsListControlState>,
    });
    return { api, Component: Component as React.FC<{}> };
  },
};
