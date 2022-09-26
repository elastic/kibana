/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SampleDataSet } from '@kbn/home-sample-data-types';

/**
 * Props for the `DisabledFooter` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name' | 'statusMsg'>;

const addDataLabel = i18n.translate('homePackages.sampleDataCard.default.addButtonLabel', {
  defaultMessage: 'Add data',
});

/**
 * A footer for the `SampleDataCard` displayed when an unknown error or status prevents a person
 * from installing the Sample Data Set.
 */
export const DisabledFooter = ({ id, name, statusMsg }: Props) => {
  const errorMessage = i18n.translate(
    'homePackages.sampleDataCard.default.unableToVerifyErrorMessage',
    { defaultMessage: 'Unable to verify dataset status, error: {statusMsg}', values: { statusMsg } }
  );

  const addButtonAriaLabel = i18n.translate(
    'homePackages.sampleDataCard.default.addButtonAriaLabel',
    {
      defaultMessage: 'Add {datasetName}',
      values: {
        datasetName: name,
      },
    }
  );

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={<p>{errorMessage}</p>}>
          <EuiButton
            isDisabled
            data-test-subj={`addSampleDataSet${id}`}
            aria-label={addButtonAriaLabel}
          >
            {addDataLabel}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
