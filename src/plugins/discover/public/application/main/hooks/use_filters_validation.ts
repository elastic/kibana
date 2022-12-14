/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IToasts, ToastsStart } from '@kbn/core/public';
import { FilterManager } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { useEffect } from 'react';
import { debounceTime } from 'rxjs';

const addInvalidFiltersWarn = (toastNotifications: IToasts) => {
  const warningTitle = i18n.translate('discover.invalidFiltersWarnToast.title', {
    defaultMessage: 'Different index references',
  });
  toastNotifications.addWarning({
    title: warningTitle,
    text: i18n.translate('discover.invalidFiltersWarnToast.description', {
      defaultMessage:
        'Data view id references in some of the applied filters differ from the current data view.',
    }),
    'data-test-subj': 'invalidFiltersWarnToast',
  });
};

export const useFiltersValidation = ({
  savedSearch,
  filterManager,
  toastNotifications,
}: {
  savedSearch: SavedSearch;
  filterManager: FilterManager;
  toastNotifications: ToastsStart;
}) => {
  useEffect(() => {
    const subscription = filterManager
      .getUpdates$()
      .pipe(debounceTime(500))
      .subscribe(() => {
        const currentFilters = filterManager.getFilters();
        const dataView = savedSearch.searchSource.getField('index');
        const areFiltersInvalid =
          dataView &&
          !dataView.isPersisted() &&
          !currentFilters.every((current) => current.meta.index === dataView.id);
        if (areFiltersInvalid) {
          addInvalidFiltersWarn(toastNotifications);
        }
      });
    return () => subscription.unsubscribe();
  }, [filterManager, savedSearch.searchSource, toastNotifications]);
};
