/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { OptionsListSearchTechnique } from '@kbn/controls-plugin/common/options_list/suggestions_searching';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';

import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import {
  DEFAULT_SEARCH_TECHNIQUE,
  OptionsListControlApi,
  OptionsListControlState,
  OPTIONS_LIST_CONTROL_TYPE,
} from './types';

export const getOptionsListControlFactory = ({
  core,
  dataViewsService,
}: {
  core: CoreStart;
  dataViewsService: DataViewsPublicPluginStart;
}): DataControlFactory<OptionsListControlState, OptionsListControlApi> => {
  return {
    type: OPTIONS_LIST_CONTROL_TYPE,
    getIconType: () => 'search',
    getDisplayName: () =>
      i18n.translate('controls.optionsList.displayName', {
        defaultMessage: 'Options list',
      }),
    isFieldCompatible: (field) => {
      return (
        field.searchable &&
        field.spec.type === 'string' &&
        (field.spec.esTypes ?? []).includes('text')
      );
    },
    CustomOptionsComponent: ({ stateManager }) => {
      return <>Search techniques</>;
    },
    buildControl: (initialState, buildApi, uuid, parentApi) => {
      const searchTechnique = new BehaviorSubject<OptionsListSearchTechnique | undefined>(
        initialState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE
      );
      const editorStateManager = { searchTechnique };

      const dataControl = initializeDataControl<Pick<OptionsListControlState, 'searchTechnique'>>(
        uuid,
        OPTIONS_LIST_CONTROL_TYPE,
        initialState,
        editorStateManager,
        parentApi,
        {
          core,
          dataViews: dataViewsService,
        }
      );

      const api = buildApi(
        {
          ...dataControl.api,
          getTypeDisplayName: () =>
            i18n.translate('controlsExamples.searchControl.displayName', {
              defaultMessage: 'Search',
            }),
          serializeState: () => {
            const { rawState: dataControlState, references } = dataControl.serialize();
            return {
              rawState: {
                ...dataControlState,
                searchTechnique: searchTechnique.getValue(),
              },
              references, // does not have any references other than those provided by the data control serializer
            };
          },
          clearSelections: () => {
            // TODO: Reset selections
          },
        },
        {
          ...dataControl.comparators,
          searchTechnique: [
            searchTechnique,
            (newTechnique: OptionsListSearchTechnique | undefined) =>
              searchTechnique.next(newTechnique),
          ],
        }
      );

      return {
        api,
        /**
         * The `conrolStyleProps` prop is necessary because it contains the props from the generic
         * ControlPanel that are necessary for styling
         */
        Component: (conrolStyleProps) => {
          return <div {...conrolStyleProps}>Component</div>;
        },
      };
    },
  };
};
