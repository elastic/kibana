/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient, SavedObject, ToastsStart } from 'kibana/public';
import { IndexPattern } from '../../../../kibana_services';
import { IndexPatternsContract, SearchSource } from '../../../../../../data/common';

export type IndexPatternSavedObject = SavedObject & { title: string };

interface IndexPatternData {
  /**
   * List of existing index patterns
   */
  list: IndexPatternSavedObject[];
  /**
   * Loaded index pattern (might be default index pattern if requested was not found)
   */
  loaded: IndexPattern;
  /**
   * Id of the requested index pattern
   */
  stateVal: string;
  /**
   * Determines if requested index pattern was found
   */
  stateValFound: boolean;
}

export function findIndexPatternById(
  indexPatterns: IndexPatternSavedObject[],
  id: string
): IndexPatternSavedObject | undefined {
  if (!Array.isArray(indexPatterns) || !id) {
    return;
  }
  return indexPatterns.find((o) => o.id === id);
}

/**
 * Checks if the given defaultIndex exists and returns
 * the first available index pattern id if not
 */
export function getFallbackIndexPatternId(
  indexPatterns: IndexPatternSavedObject[],
  defaultIndex: string = ''
): string {
  if (defaultIndex && findIndexPatternById(indexPatterns, defaultIndex)) {
    return defaultIndex;
  }
  return indexPatterns && indexPatterns[0]?.id ? indexPatterns[0].id : '';
}

/**
 * A given index pattern id is checked for existence and a fallback is provided if it doesn't exist
 * The provided defaultIndex is usually configured in Advanced Settings, if it's also invalid
 * the first entry of the given list of Indexpatterns is used
 */
export function getIndexPatternId(
  id: string = '',
  indexPatterns: IndexPatternSavedObject[] = [],
  defaultIndex: string = ''
): string {
  if (!id || !findIndexPatternById(indexPatterns, id)) {
    return getFallbackIndexPatternId(indexPatterns, defaultIndex);
  }
  return id;
}

/**
 * Function to load the given index pattern by id, providing a fallback if it doesn't exist
 */
export async function loadIndexPattern(
  id: string,
  indexPatterns: IndexPatternsContract,
  config: IUiSettingsClient
): Promise<IndexPatternData> {
  const indexPatternList = ((await indexPatterns.getCache()) as unknown) as IndexPatternSavedObject[];

  const actualId = getIndexPatternId(id, indexPatternList, config.get('defaultIndex'));
  return {
    list: indexPatternList || [],
    loaded: await indexPatterns.get(actualId),
    stateVal: id,
    stateValFound: !!id && actualId === id,
  };
}

/**
 * Function used in the discover controller to message the user about the state of the current
 * index pattern
 */
export function resolveIndexPattern(
  ip: IndexPatternData,
  searchSource: SearchSource,
  toastNotifications: ToastsStart
) {
  const { loaded: loadedIndexPattern, stateVal, stateValFound } = ip;

  const ownIndexPattern = searchSource.getOwnField('index');

  if (ownIndexPattern && !stateVal) {
    return ownIndexPattern;
  }

  if (stateVal && !stateValFound) {
    const warningTitle = i18n.translate('discover.valueIsNotConfiguredIndexPatternIDWarningTitle', {
      defaultMessage: '{stateVal} is not a configured index pattern ID',
      values: {
        stateVal: `"${stateVal}"`,
      },
    });

    if (ownIndexPattern) {
      toastNotifications.addWarning({
        title: warningTitle,
        text: i18n.translate('discover.showingSavedIndexPatternWarningDescription', {
          defaultMessage:
            'Showing the saved index pattern: "{ownIndexPatternTitle}" ({ownIndexPatternId})',
          values: {
            ownIndexPatternTitle: ownIndexPattern.title,
            ownIndexPatternId: ownIndexPattern.id,
          },
        }),
      });
      return ownIndexPattern;
    }

    toastNotifications.addWarning({
      title: warningTitle,
      text: i18n.translate('discover.showingDefaultIndexPatternWarningDescription', {
        defaultMessage:
          'Showing the default index pattern: "{loadedIndexPatternTitle}" ({loadedIndexPatternId})',
        values: {
          loadedIndexPatternTitle: loadedIndexPattern.title,
          loadedIndexPatternId: loadedIndexPattern.id,
        },
      }),
    });
  }

  return loadedIndexPattern;
}
