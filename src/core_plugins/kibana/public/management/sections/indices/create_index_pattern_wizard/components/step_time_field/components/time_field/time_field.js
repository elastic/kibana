import React from 'react';

import './time_field.css';

import {
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSelect,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';

export const TimeField = ({
  isVisible,
  fetchTimeFields,
  timeFieldOptions,
  isLoading,
  selectedTimeField,
  onTimeFieldChanged,
}) => (
  <EuiForm>
    { isVisible ?
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <span>Time Filter field name</span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              { isLoading ? (
                <EuiLoadingSpinner size="s"/>
              )
                : (
                  <EuiLink
                    className="timeFieldRefreshButton"
                    onClick={fetchTimeFields}
                  >
                    Refresh
                  </EuiLink>
                )
              }
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
        { isLoading ? (
          <EuiSelect
            name="timeField"
            data-test-subj="createIndexPatternTimeFieldSelect"
            options={[
              { text: 'Loading...', value: '' }
            ]}
            disabled={true}
          />
        ) : (
          <EuiSelect
            name="timeField"
            data-test-subj="createIndexPatternTimeFieldSelect"
            options={timeFieldOptions}
            isLoading={isLoading}
            disabled={isLoading}
            value={selectedTimeField}
            onChange={onTimeFieldChanged}
          />
        )}
      </EuiFormRow>
      :
      <EuiText>
        <p>The indices which match this index pattern don&apos;t contain any time fields.</p>
      </EuiText>
    }
  </EuiForm>
);
