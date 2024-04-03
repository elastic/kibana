/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

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

export const useAlertResultsToast = ({
  isAlertResults,
  toastNotifications,
}: {
  isAlertResults?: boolean;
  toastNotifications: ToastsStart;
}) => {
  useEffect(() => {
    if (isAlertResults) {
      displayPossibleDocsDiffInfoAlert(toastNotifications);
    }
  }, [isAlertResults, toastNotifications]);
};
