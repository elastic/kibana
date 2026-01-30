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

/**
 * Props for the `InstallingFooter` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name'>;

const installingLabel = i18n.translate('homePackages.sampleDataCard.installingButtonLabel', {
  defaultMessage: 'Installing',
});

/**
 * A footer displayed when a Sample Data Set is being installed (background task in progress).
 */
export const InstallingFooter = ({ id, name }: Props) => {
  const installingAriaLabel = i18n.translate(
    'homePackages.sampleDataCard.installingButtonAriaLabel',
    {
      defaultMessage: 'Installing {datasetName}',
      values: {
        datasetName: name,
      },
    }
  );

  return (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiButton
          color="text"
          isLoading={true}
          isDisabled={true}
          iconType="download"
          data-test-subj={`addSampleDataSet${id}`}
          aria-label={installingAriaLabel}
        >
          {installingLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
