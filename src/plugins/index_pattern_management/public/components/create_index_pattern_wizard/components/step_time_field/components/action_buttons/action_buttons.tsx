/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const ActionButtons = ({
  goToPreviousStep,
  submittable,
  createIndexPattern,
}: {
  goToPreviousStep: () => void;
  submittable: boolean;
  createIndexPattern: () => void;
}) => (
  <EuiFlexGroup justifyContent="flexEnd">
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty iconType="arrowLeft" onClick={goToPreviousStep}>
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.stepTime.backButton"
          defaultMessage="Back"
        />
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton
        isDisabled={!submittable}
        data-test-subj="createIndexPatternButton"
        fill
        onClick={createIndexPattern}
      >
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.stepTime.createPatternButton"
          defaultMessage="Create index pattern"
        />
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
