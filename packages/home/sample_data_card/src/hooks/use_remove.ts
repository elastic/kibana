/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import type { SampleDataSet } from '@kbn/home-sample-data-types';
import { useServices } from '../services';

/**
 * Parameters for the `useRemove` React hook.
 */
export type Params = Pick<SampleDataSet, 'id' | 'defaultIndex' | 'name'> & {
  /** Handler to invoke when the Sample Data Set is successfully removed. */
  onRemove: (id: string) => void;
};

/**
 * A React hook that allows a component to remove a sample data set, handling success and
 * failure in the Kibana UI.  It also provides a boolean that indicates if the data set is
 * in the process of being removed.
 */
export const useRemove = ({ id, defaultIndex, name, onRemove }: Params): [() => void, boolean] => {
  const { removeSampleDataSet, notifyError, notifySuccess } = useServices();
  const [isRemoving, setIsRemoving] = React.useState(false);

  const remove = useCallback(async () => {
    try {
      setIsRemoving(true);
      await removeSampleDataSet(id, defaultIndex);
      setIsRemoving(false);

      notifySuccess({
        title: i18n.translate('homePackages.sampleDataSet.uninstalledLabel', {
          defaultMessage: '{name} uninstalled',
          values: { name },
        }),
        ['data-test-subj']: 'sampleDataSetUninstallToast',
      });

      onRemove(id);
    } catch (e) {
      setIsRemoving(false);

      notifyError({
        title: i18n.translate('homePackages.sampleDataSet.unableToUninstallErrorMessage', {
          defaultMessage: 'Unable to uninstall sample data set: {name}',
          values: { name },
        }),
        text: `${e.message}`,
      });
    }
  }, [removeSampleDataSet, notifyError, notifySuccess, id, defaultIndex, name, onRemove]);

  return [remove, isRemoving];
};
