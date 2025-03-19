/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import type { SampleDataSet } from '@kbn/home-sample-data-types';
import { useServices } from '../services';

/**
 * Parameters for the `useInstall` React hook.
 */
export type Params = Pick<SampleDataSet, 'id' | 'defaultIndex' | 'name'> & {
  /** Handler to invoke when the Sample Data Set is successfully installed. */
  onInstall: (id: string) => void;
};

/**
 * A React hook that allows a component to install a sample data set, handling success and
 * failure in the Kibana UI.  It also provides a boolean that indicates if the data set is
 * in the process of being installed.
 */
export const useInstall = ({
  id,
  defaultIndex,
  name,
  onInstall,
}: Params): [() => void, boolean] => {
  const { installSampleDataSet, notifyError, notifySuccess } = useServices();
  const [isInstalling, setIsInstalling] = React.useState(false);

  const install = useCallback(async () => {
    try {
      setIsInstalling(true);
      await installSampleDataSet(id, defaultIndex);
      setIsInstalling(false);

      notifySuccess({
        title: i18n.translate('homePackages.sampleDataSet.installedLabel', {
          defaultMessage: '{name} installed',
          values: { name },
        }),
        ['data-test-subj']: 'sampleDataSetInstallToast',
      });
      onInstall(id);
    } catch (e) {
      setIsInstalling(false);
      notifyError({
        title: i18n.translate('homePackages.sampleDataSet.unableToInstallErrorMessage', {
          defaultMessage: 'Unable to install sample data set: {name}',
          values: { name },
        }),
        text: `${e.message}`,
      });
    }
  }, [installSampleDataSet, notifyError, notifySuccess, id, defaultIndex, name, onInstall]);

  return [install, isInstalling];
};
