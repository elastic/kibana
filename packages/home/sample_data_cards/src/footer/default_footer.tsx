/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SampleDataSet } from '../types';

export type Props = Pick<SampleDataSet, 'id' | 'name' | 'statusMsg'>;

export const DefaultFooter = ({ id, name, statusMsg }: Props) => {
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={
            <p>
              <FormattedMessage
                id="home.sampleDataSetCard.default.unableToVerifyErrorMessage"
                defaultMessage="Unable to verify dataset status, error: {statusMsg}"
                values={{ statusMsg }}
              />
            </p>
          }
        >
          <EuiButton
            isDisabled
            data-test-subj={`addSampleDataSet${id}`}
            aria-label={i18n.translate('home.sampleDataSetCard.default.addButtonAriaLabel', {
              defaultMessage: 'Add {datasetName}',
              values: {
                datasetName: name,
              },
            })}
          >
            <FormattedMessage
              id="home.sampleDataSetCard.default.addButtonLabel"
              defaultMessage="Add data"
            />
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
