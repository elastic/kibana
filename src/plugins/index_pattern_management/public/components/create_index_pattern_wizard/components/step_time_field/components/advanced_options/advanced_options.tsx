/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiForm, EuiFormRow, EuiFieldText, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

interface AdvancedOptionsProps {
  isVisible: boolean;
  indexPatternId: string;
  toggleAdvancedOptions: (e: React.FormEvent<HTMLButtonElement>) => void;
  onChangeIndexPatternId: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
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
      {isVisible ? (
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.stepTime.options.hideButton"
          defaultMessage="Hide advanced settings"
        />
      ) : (
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.stepTime.options.showButton"
          defaultMessage="Show advanced settings"
        />
      )}
    </EuiButtonEmpty>
    <EuiSpacer size="xs" />
    {isVisible ? (
      <EuiForm>
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternManagement.createIndexPattern.stepTime.options.patternHeader"
              defaultMessage="Custom index pattern ID"
            />
          }
          helpText={
            <FormattedMessage
              id="indexPatternManagement.createIndexPattern.stepTime.options.patternLabel"
              defaultMessage="Kibana will provide a unique identifier for each index pattern. If you do not want to use this unique ID,
            enter a custom one."
            />
          }
        >
          <EuiFieldText
            name="indexPatternId"
            data-test-subj="createIndexPatternIdInput"
            value={indexPatternId}
            onChange={onChangeIndexPatternId}
            placeholder={i18n.translate(
              'indexPatternManagement.createIndexPattern.stepTime.options.patternPlaceholder',
              {
                defaultMessage: 'custom-index-pattern-id',
              }
            )}
          />
        </EuiFormRow>
      </EuiForm>
    ) : null}
  </div>
);
