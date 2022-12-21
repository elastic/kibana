/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { SampleDataSet } from '@kbn/home-sample-data-types';
import { useInstall } from '../hooks';
import type { UseInstallParams } from '../hooks';

/**
 * Props for the `InstallFooter` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name'> & UseInstallParams;

const addingLabel = i18n.translate('homePackages.sampleDataCard.addingButtonLabel', {
  defaultMessage: 'Adding',
});

const addLabel = i18n.translate('homePackages.sampleDataCard.addButtonLabel', {
  defaultMessage: 'Add data',
});

/**
 * A footer displayed when a Sample Data Set is not installed, allowing a person to install it.
 */
export const InstallFooter = (params: Props) => {
  const [install, isInstalling] = useInstall(params);
  const { id, name } = params;

  const addingAriaLabel = i18n.translate('homePackages.sampleDataCard.addingButtonAriaLabel', {
    defaultMessage: 'Adding {datasetName}',
    values: {
      datasetName: name,
    },
  });

  const addAriaLabel = i18n.translate('homePackages.sampleDataCard.addButtonAriaLabel', {
    defaultMessage: 'Add {datasetName}',
    values: {
      datasetName: name,
    },
  });

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButton
          isLoading={isInstalling}
          onClick={install}
          data-test-subj={`addSampleDataSet${id}`}
          aria-label={isInstalling ? addingAriaLabel : addAriaLabel}
        >
          {isInstalling ? addingLabel : addLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
