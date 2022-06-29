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
  onRemove: (id: string) => void;
};

export const useRemove = ({ id, defaultIndex, name, onRemove }: Params): [() => void, boolean] => {
  const { uninstallSampleDataSet, notifyError, notifySuccess } = useServices();
  const [isRemoving, setIsRemoving] = React.useState(false);

  const remove = useCallback(async () => {
    try {
      setIsRemoving(true);
      await uninstallSampleDataSet(id, defaultIndex);
      setIsRemoving(false);

      notifySuccess({
        title: i18n.translate('home.sampleDataSet.uninstalledLabel', {
          defaultMessage: '{name} uninstalled',
          values: { name },
        }),
        ['data-test-subj']: 'sampleDataSetUninstallToast',
      });
      onRemove(id);
    } catch (e) {
      setIsRemoving(false);
      notifyError({
        title: i18n.translate('home.sampleDataSet.unableToUninstallErrorMessage', {
          defaultMessage: 'Unable to uninstall sample data set: {name}',
          values: { name },
        }),
        text: `${e.message}`,
      });
    }
  }, [uninstallSampleDataSet, notifyError, notifySuccess, id, defaultIndex, name, onRemove]);

  return [remove, isRemoving];
};
