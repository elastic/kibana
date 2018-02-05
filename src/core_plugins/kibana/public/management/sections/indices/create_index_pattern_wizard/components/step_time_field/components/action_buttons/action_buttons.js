import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty
} from '@elastic/eui';

export const ActionButtons = ({
  goToPreviousStep,
  submittable,
  createIndexPattern,
}) => (
  <EuiFlexGroup justifyContent="flexEnd">
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        iconType="arrowLeft"
        onClick={goToPreviousStep}
      >
        Back
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton
        isDisabled={!submittable}
        data-test-subj="createIndexPatternCreateButton"
        fill
        onClick={createIndexPattern}
      >
        Create index pattern
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
