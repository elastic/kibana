/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import useMount from 'react-use/lib/useMount';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import type { MainHistoryLocationState } from '../../../../common';

export const displayPossibleDocsDiffInfoAlert = (toastNotifications: ToastsStart) => {
  const infoTitle = i18n.translate('discover.viewAlert.documentsMayVaryInfoTitle', {
    defaultMessage: 'Displayed documents may vary',
  });
  const infoDescription = i18n.translate('discover.viewAlert.documentsMayVaryInfoDescription', {
    defaultMessage: `The displayed documents might differ from the documents that triggered the alert.
         Some documents might have been added or deleted.`,
  });

  toastNotifications.addInfo({
    title: infoTitle,
    text: infoDescription,
  });
};

export const useAlertResultsToast = () => {
  const { getScopedHistory, toastNotifications } = useDiscoverServices();

  useMount(() => {
    const historyLocationState = getScopedHistory<MainHistoryLocationState>()?.location.state;

    if (historyLocationState?.isAlertResults) {
      displayPossibleDocsDiffInfoAlert(toastNotifications);
    }
  });
};
