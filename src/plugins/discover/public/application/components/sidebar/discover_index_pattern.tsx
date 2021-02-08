/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IUiSettingsClient, SavedObject } from 'kibana/public';
import {
  IndexPattern,
  IndexPatternAttributes,
  IndexPatternsContract,
} from 'src/plugins/data/public';
import { I18nProvider } from '@kbn/i18n/react';

import { IndexPatternRef } from './types';
import { ChangeIndexPattern } from './change_indexpattern';
import { getSwitchIndexPatternAppState } from '../../helpers/get_switch_index_pattern_app_state';
import { SortPairArr } from '../../angular/doc_table/lib/get_sort';
import { MODIFY_COLUMNS_ON_SWITCH } from '../../../../common';
import { AppState } from '../../angular/discover_state';
export interface DiscoverIndexPatternProps {
  /**
   * Client of uiSettings
   */
  config: IUiSettingsClient;
  /**
   * list of available index patterns, if length > 1, component offers a "change" link
   */
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  /**
   * Index patterns service
   */
  indexPatterns: IndexPatternsContract;
  /**
   * currently selected index pattern, due to angular issues it's undefined at first rendering
   */
  selectedIndexPattern: IndexPattern;
  /**
   * Function to set the current state
   */
  setAppState: (state: Partial<AppState>) => void;
  /**
   * Discover App state
   */
  state: AppState;
  /**
   * Read from the Fields API
   */
  useNewFieldsApi?: boolean;
}

/**
 * Component allows you to select an index pattern in discovers side bar
 */
export function DiscoverIndexPattern({
  config,
  indexPatternList,
  selectedIndexPattern,
  indexPatterns,
  state,
  setAppState,
  useNewFieldsApi,
}: DiscoverIndexPatternProps) {
  const options: IndexPatternRef[] = (indexPatternList || []).map((entity) => ({
    id: entity.id,
    title: entity.attributes!.title,
  }));
  const { id: selectedId, title: selectedTitle } = selectedIndexPattern || {};

  const setIndexPattern = useCallback(
    async (id: string) => {
      const nextIndexPattern = await indexPatterns.get(id);
      if (nextIndexPattern && selectedIndexPattern) {
        const nextAppState = getSwitchIndexPatternAppState(
          selectedIndexPattern,
          nextIndexPattern,
          state.columns || [],
          (state.sort || []) as SortPairArr[],
          config.get(MODIFY_COLUMNS_ON_SWITCH),
          useNewFieldsApi
        );
        setAppState(nextAppState);
      }
    },
    [selectedIndexPattern, state, config, indexPatterns, setAppState, useNewFieldsApi]
  );

  const [selected, setSelected] = useState({
    id: selectedId,
    title: selectedTitle || '',
  });
  useEffect(() => {
    const { id, title } = selectedIndexPattern;
    setSelected({ id, title });
  }, [selectedIndexPattern]);
  if (!selectedId) {
    return null;
  }

  return (
    <I18nProvider>
      <ChangeIndexPattern
        trigger={{
          label: selected.title,
          title: selected.title,
          'data-test-subj': 'indexPattern-switch-link',
        }}
        indexPatternId={selected.id}
        indexPatternRefs={options}
        onChangeIndexPattern={(id) => {
          const indexPattern = options.find((pattern) => pattern.id === id);
          if (indexPattern) {
            setIndexPattern(id);
            setSelected(indexPattern);
          }
        }}
      />
    </I18nProvider>
  );
}
