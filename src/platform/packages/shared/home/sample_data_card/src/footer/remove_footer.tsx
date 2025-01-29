/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { SampleDataSet } from '@kbn/home-sample-data-types';
import { useRemove } from '../hooks';
import { ViewButton } from './view_button';
import type { UseRemoveParams } from '../hooks';
import type { Props as ViewButtonProps } from './view_button';

/**
 * Props for the `RemoveFooter` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name'> & UseRemoveParams & ViewButtonProps;

const removeLabel = i18n.translate('homePackages.sampleDataCard.removeButtonLabel', {
  defaultMessage: 'Remove',
});

const removingLabel = i18n.translate('homePackages.sampleDataCard.removingButtonLabel', {
  defaultMessage: 'Removing',
});

/**
 * A footer displayed when a Sample Data Set is installed, allowing a person to remove it or view
 * saved objects associated with it in their related solutions.
 */
export const RemoveFooter = (props: Props) => {
  const [remove, isRemoving] = useRemove(props);
  const { id, name } = props;

  const removeAriaLabel = i18n.translate('homePackages.sampleDataCard.removeButtonAriaLabel', {
    defaultMessage: 'Remove {datasetName}',
    values: {
      datasetName: name,
    },
  });

  const removingAriaLabel = i18n.translate('homePackages.sampleDataCard.removingButtonAriaLabel', {
    defaultMessage: 'Removing {datasetName}',
    values: {
      datasetName: name,
    },
  });

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          isLoading={isRemoving}
          onClick={remove}
          color="danger"
          data-test-subj={`removeSampleDataSet${id}`}
          flush="left"
          aria-label={isRemoving ? removingAriaLabel : removeAriaLabel}
        >
          {isRemoving ? removingLabel : removeLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ViewButton {...props} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
