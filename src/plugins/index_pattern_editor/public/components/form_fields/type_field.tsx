/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { euiColorAccent } from '@elastic/eui/dist/eui_theme_light.json';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFormRow,
  EuiSuperSelect,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiBadge,
} from '@elastic/eui';

import { UseField } from '../../shared_imports';

import { IndexPatternConfig } from '../index_pattern_editor_flyout_content';

const standardSelectItem = (
  <EuiDescriptionList style={{ whiteSpace: 'nowrap' }}>
    <EuiDescriptionListTitle>
      <FormattedMessage
        id="indexPatternEditor.typeSelect.standardTitle"
        defaultMessage="Standard index pattern"
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
  <EuiDescriptionList style={{ whiteSpace: 'nowrap' }}>
    <EuiDescriptionListTitle>
      <FormattedMessage
        id="indexPatternEditor.typeSelect.rollupTitle"
        defaultMessage="Rollup index pattern"
      />
      &nbsp;
      <EuiBadge color={euiColorAccent}>
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

export const TypeField = () => {
  return (
    <UseField<string, IndexPatternConfig> path="type">
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
                    value: 'default',
                    inputDisplay: 'Standard',
                    dropdownDisplay: standardSelectItem,
                  },
                  { value: 'rollup', inputDisplay: 'Rollup', dropdownDisplay: rollupSelectItem },
                ]}
                valueOfSelected={value}
                onChange={(newValue) => {
                  setValue(newValue);
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
