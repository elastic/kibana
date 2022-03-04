/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFormRow,
  EuiSuperSelect,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiBadge,
} from '@elastic/eui';

import { UseField } from '../../shared_imports';

import { INDEX_PATTERN_TYPE, IndexPatternConfig } from '../../types';

interface TypeFieldProps {
  onChange: (type: INDEX_PATTERN_TYPE) => void;
}

const standardSelectItem = (
  <EuiDescriptionList style={{ whiteSpace: 'nowrap' }} data-test-subj="standardType">
    <EuiDescriptionListTitle>
      <FormattedMessage
        id="indexPatternEditor.typeSelect.standardTitle"
        defaultMessage="Standard data view"
      />
    </EuiDescriptionListTitle>
    <EuiDescriptionListDescription>
      <FormattedMessage
        id="indexPatternEditor.typeSelect.standardDescription"
        defaultMessage="Perform full aggregations against any data"
      />
    </EuiDescriptionListDescription>
  </EuiDescriptionList>
);

const rollupSelectItem = (
  <EuiDescriptionList style={{ whiteSpace: 'nowrap' }} data-test-subj="rollupType">
    <EuiDescriptionListTitle>
      <FormattedMessage
        id="indexPatternEditor.typeSelect.rollupTitle"
        defaultMessage="Rollup data view"
      />
      &nbsp;
      <EuiBadge color={euiLightVars.euiColorAccent}>
        <FormattedMessage id="indexPatternEditor.typeSelect.betaLabel" defaultMessage="Beta" />
      </EuiBadge>
    </EuiDescriptionListTitle>
    <EuiDescriptionListDescription>
      <FormattedMessage
        id="indexPatternEditor.typeSelect.rollupDescription"
        defaultMessage="Perform limited aggregations against summarized data"
      />
    </EuiDescriptionListDescription>
  </EuiDescriptionList>
);

export const TypeField = ({ onChange }: TypeFieldProps) => {
  return (
    <UseField<INDEX_PATTERN_TYPE, IndexPatternConfig> path="type">
      {({ label, value, setValue }) => {
        if (value === undefined) {
          return null;
        }
        return (
          <>
            <EuiFormRow label={label} fullWidth>
              <EuiSuperSelect
                data-test-subj="typeField"
                options={[
                  {
                    value: INDEX_PATTERN_TYPE.DEFAULT,
                    inputDisplay: i18n.translate('indexPatternEditor.typeSelect.standard', {
                      defaultMessage: 'Standard',
                    }),
                    dropdownDisplay: standardSelectItem,
                  },
                  {
                    value: INDEX_PATTERN_TYPE.ROLLUP,
                    inputDisplay: i18n.translate('indexPatternEditor.typeSelect.rollup', {
                      defaultMessage: 'Rollup',
                    }),
                    dropdownDisplay: rollupSelectItem,
                  },
                ]}
                valueOfSelected={value}
                onChange={(newValue) => {
                  setValue(newValue);
                  onChange(newValue);
                }}
                aria-label={i18n.translate('indexPatternEditor.editor.form.typeSelectAriaLabel', {
                  defaultMessage: 'Type field',
                })}
                fullWidth
              />
            </EuiFormRow>
          </>
        );
      }}
    </UseField>
  );
};
