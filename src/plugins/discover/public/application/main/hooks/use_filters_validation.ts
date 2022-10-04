/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';
import { debounceTime } from 'rxjs';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { GetStateReturn } from '../services/discover_state';

const addInvalidFiltersWarn = (toastNotifications: IToasts) => {
  const warningTitle = i18n.translate('discover.invalidFiltersWarnToast.title', {
    defaultMessage: 'Index references in filters are differ from current data view',
  });
  toastNotifications.addWarning({
    title: warningTitle,
    text: i18n.translate('discover.invalidFiltersWarnToast.description', {
      defaultMessage:
        'Data view id references in some of the applied filters are differ from chosen data view',
    }),
    'data-test-subj': 'invalidFiltersWarnToast',
  });
};

export const useFiltersValidation = ({ stateContainer }: { stateContainer: GetStateReturn }) => {
  const { filterManager, toastNotifications } = useDiscoverServices();
  useEffect(() => {
    const subscription = filterManager
      .getUpdates$()
      .pipe(debounceTime(500))
      .subscribe(() => {
        const currentFilters = filterManager.getFilters();
        const { index: currentDataViewId } = stateContainer.appStateContainer.getState();
        const areFiltersInvalid =
          currentDataViewId &&
          !currentFilters.every((current) => current.meta.index === currentDataViewId);
        if (areFiltersInvalid) {
          addInvalidFiltersWarn(toastNotifications);
        }
      });
    return () => subscription.unsubscribe();
  }, [filterManager, stateContainer.appStateContainer, toastNotifications]);
};
