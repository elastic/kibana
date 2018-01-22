import React from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

export const AdvancedOptions = ({
  showingAdvancedOptions,
  indexPatternId,
  toggleAdvancedOptions,
  onChangeIndexPatternId,
}) => (
  <div>
    <EuiButtonEmpty
      iconType={showingAdvancedOptions ? 'arrowDown' : 'arrowRight'}
      onClick={toggleAdvancedOptions}
    >
      { showingAdvancedOptions
        ? (<span>Hide advanced options</span>)
        : (<span>Show advanced options</span>)
      }

    </EuiButtonEmpty>
    <EuiSpacer size="xs"/>
    { showingAdvancedOptions ?
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
      : null
    }
  </div>
);
