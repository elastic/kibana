import React from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

export const TimeField = ({
  showTimeField,
  fetchTimeFields,
  timeFieldOptions,
  timeFields,
  selectedTimeField,
  onTimeFieldChanged,
}) => (
  <EuiForm>
    { showTimeField ?
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <span>Time Filter field name</span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={fetchTimeFields}
              >
                Refresh
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        helpText={
          <div>
            <p>The Time Filter will use this field to filter your data by time.</p>
            <p>You can choose not to have a time field, but you will not be able to narrow down your data by a time range.</p>
          </div>
        }
      >
        <EuiSelect
          name="timeField"
          data-test-subj="createIndexPatternTimeFieldSelect"
          options={timeFieldOptions}
          isLoading={!timeFields}
          value={selectedTimeField}
          onChange={onTimeFieldChanged}
        />
      </EuiFormRow>
      :
      <EuiText>
        <p>The indices which match this index pattern don&apos;t contain any time fields.</p>
      </EuiText>
    }
  </EuiForm>
);
