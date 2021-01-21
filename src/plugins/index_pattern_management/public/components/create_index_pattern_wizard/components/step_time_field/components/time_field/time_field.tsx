/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiLink,
  EuiSelect,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

interface TimeFieldProps {
  isVisible: boolean;
  fetchTimeFields: () => void;
  timeFieldOptions: Array<{ text: string; value?: string }>;
  isLoading: boolean;
  selectedTimeField?: string;
  onTimeFieldChanged: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const TimeField: React.FC<TimeFieldProps> = ({
  isVisible,
  fetchTimeFields,
  timeFieldOptions,
  isLoading,
  selectedTimeField,
  onTimeFieldChanged,
}) => (
  <EuiForm>
    {isVisible ? (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="indexPatternManagement.createIndexPattern.stepTime.timeDescription"
              defaultMessage="Select a primary time field for use with the global time filter."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternManagement.createIndexPattern.stepTime.fieldLabel"
              defaultMessage="Time field"
            />
          }
          labelAppend={
            isLoading ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiText size="xs">
                <EuiLink onClick={fetchTimeFields}>
                  <FormattedMessage
                    id="indexPatternManagement.createIndexPattern.stepTime.refreshButton"
                    defaultMessage="Refresh"
                  />
                </EuiLink>
              </EuiText>
            )
          }
        >
          {isLoading ? (
            <EuiSelect
              name="timeField"
              data-test-subj="createIndexPatternTimeFieldSelect"
              options={[
                {
                  text: i18n.translate(
                    'indexPatternManagement.createIndexPattern.stepTime.field.loadingDropDown',
                    {
                      defaultMessage: 'Loading…',
                    }
                  ),
                  value: '',
                },
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
      </>
    ) : (
      <EuiText>
        <p>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.stepTime.field.noTimeFieldsLabel"
            defaultMessage="The indices which match this index pattern don't contain any time fields."
          />
        </p>
      </EuiText>
    )}
  </EuiForm>
);
