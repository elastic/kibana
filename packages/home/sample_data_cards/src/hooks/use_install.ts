/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { useServices } from '../services';
import type { SampleDataSet } from '../types';

export type Params = Pick<SampleDataSet, 'id' | 'defaultIndex' | 'name'> & {
  onInstall: (id: string) => void;
};

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
        title: i18n.translate('home.sampleDataSet.installedLabel', {
          defaultMessage: '{name} installed',
          values: { name },
        }),
        ['data-test-subj']: 'sampleDataSetInstallToast',
      });
      onInstall(id);
    } catch (e) {
      setIsInstalling(false);
      notifyError({
        title: i18n.translate('home.sampleDataSet.unableToInstallErrorMessage', {
          defaultMessage: 'Unable to install sample data set: {name}',
          values: { name },
        }),
        text: `${e.message}`,
      });
    }
  }, [installSampleDataSet, notifyError, notifySuccess, id, defaultIndex, name, onInstall]);

  return [install, isInstalling];
};
