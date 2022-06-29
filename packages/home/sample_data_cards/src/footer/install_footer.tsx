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
import { FormattedMessage } from '@kbn/i18n-react';

import { useInstall } from '../hooks';
import type { SampleDataSet } from '../types';
import type { UseInstallParams } from '../hooks';

export type Props = Pick<SampleDataSet, 'id' | 'name'> & UseInstallParams;

export const InstallFooter = (params: Props) => {
  const [install, isInstalling] = useInstall(params);
  const { id, name } = params;

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButton
          isLoading={isInstalling}
          onClick={install}
          data-test-subj={`addSampleDataSet${id}`}
          aria-label={
            isInstalling
              ? i18n.translate('homePackages.sampleDataCard.addingButtonAriaLabel', {
                  defaultMessage: 'Adding {datasetName}',
                  values: {
                    datasetName: name,
                  },
                })
              : i18n.translate('homePackages.sampleDataCard.addButtonAriaLabel', {
                  defaultMessage: 'Add {datasetName}',
                  values: {
                    datasetName: name,
                  },
                })
          }
        >
          {isInstalling ? (
            <FormattedMessage
              id="homePackages.sampleDataCard.addingButtonLabel"
              defaultMessage="Adding"
            />
          ) : (
            <FormattedMessage
              id="homePackages.sampleDataCard.addButtonLabel"
              defaultMessage="Add data"
            />
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
