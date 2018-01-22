import React from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

export const AdvancedOptions = ({
  isVisible,
  indexPatternId,
  toggleAdvancedOptions,
  onChangeIndexPatternId,
}) => (
  <div>
    <EuiButtonEmpty
      iconType={isVisible ? 'arrowDown' : 'arrowRight'}
      onClick={toggleAdvancedOptions}
    >
      { isVisible
        ? (<span>Hide advanced options</span>)
        : (<span>Show advanced options</span>)
      }

    </EuiButtonEmpty>
    <EuiSpacer size="xs"/>
    { isVisible ?
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
            placeholder="custom-index-pattern-id"
          />
        </EuiFormRow>
      </EuiForm>
      : null
    }
  </div>
);
