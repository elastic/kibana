/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

const installingLabel = i18n.translate('homePackages.sampleDataCard.installingButtonLabel', {
  defaultMessage: 'Installing',
});

const installLabel = i18n.translate('homePackages.sampleDataCard.installButtonLabel', {
  defaultMessage: 'Install data',
});

/**
 * A footer displayed when a Sample Data Set is not installed, allowing a person to install it.
 */
export const InstallFooter = (params: Props) => {
  const [install, isInstalling] = useInstall(params);
  const { id, name } = params;

  const installingAriaLabel = i18n.translate(
    'homePackages.sampleDataCard.installingButtonAriaLabel',
    {
      defaultMessage: 'Installing {datasetName}',
      values: {
        datasetName: name,
      },
    }
  );

  const installAriaLabel = i18n.translate('homePackages.sampleDataCard.installButtonAriaLabel', {
    defaultMessage: 'Install {datasetName}',
    values: {
      datasetName: name,
    },
  });

  return (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiButton
          color="text"
          isLoading={isInstalling}
          onClick={install}
          iconType="download"
          data-test-subj={`addSampleDataSet${id}`}
          aria-label={isInstalling ? installingAriaLabel : installAriaLabel}
        >
          {isInstalling ? installingLabel : installLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
