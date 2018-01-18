import React from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

export const AdvancedOptions = ({
  showingAdvancedOptions,
  indexPatternId,
  onChangeIndexPatternId,
}) => {
  if (!showingAdvancedOptions) {
    return false;
  }

  return (
    <EuiForm>
      <EuiFormRow
        label="Custom index pattern ID"
        helpText={
          <span>
            Kibana will provide a unique identifier for each index pattern.
            If you do not want to use this unique ID, enter a custom one.
          </span>
        }
      >
        <EuiFieldText
          name="indexPatternId"
          data-test-subj="createIndexPatternIdInput"
          value={indexPatternId}
          onChange={onChangeIndexPatternId}
          placeholder="Id"
        />
      </EuiFormRow>
    </EuiForm>
  );
};
