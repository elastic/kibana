/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText, EuiLink, EuiText, EuiTextArea, EuiSpacer } from '@elastic/eui';
import { DataView, UseField } from '../../shared_imports';
import { IndexPatternConfig } from '../../types';

interface ReadableTitleFieldProps {
  editData?: DataView;
}

export const ReadableTitleField = ({ editData }: ReadableTitleFieldProps) => {
  const [showDescription, setShowDescription] = useState<boolean>(
    !!(editData && editData.readableTitleDescription)
  );

  return (
    <>
      <UseField<string, IndexPatternConfig>
        path="readableTitle"
        componentProps={{
          euiFieldProps: {
            'aria-label': i18n.translate('indexPatternEditor.form.readableTitleAriaLabel', {
              defaultMessage: 'Title field optional',
            }),
          },
        }}
      >
        {(field) => {
          return (
            <EuiFormRow
              label={field.label}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {i18n.translate('indexPatternEditor.form.optional', {
                    defaultMessage: 'Optional',
                  })}
                </EuiText>
              }
              fullWidth
            >
              <EuiFieldText
                value={field.value}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  field.setValue(e.target.value);
                }}
                fullWidth
                data-test-subj="createIndexPatternReadableTitleInput"
              />
            </EuiFormRow>
          );
        }}
      </UseField>
      {showDescription ? (
        <>
          <EuiSpacer size="l" />
          <UseField<string, IndexPatternConfig>
            path="readableTitleDescription"
            componentProps={{
              euiFieldProps: {
                'aria-label': i18n.translate(
                  'indexPatternEditor.form.readableTitleDescriptionLabel',
                  {
                    defaultMessage: 'Title description field optional',
                  }
                ),
              },
            }}
          >
            {(field) => {
              return (
                <EuiFormRow
                  label={field.label}
                  labelAppend={
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('indexPatternEditor.form.optional', {
                        defaultMessage: 'Optional',
                      })}
                    </EuiText>
                  }
                  helpText={
                    typeof field.helpText === 'function' ? field.helpText() : field.helpText
                  }
                  fullWidth
                >
                  <EuiTextArea
                    value={field.value}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                      field.setValue(e.target.value);
                    }}
                    fullWidth
                    rows={2}
                    data-test-subj="createIndexPatternReadableTitleDescriptionInput"
                    maxLength={150}
                  />
                </EuiFormRow>
              );
            }}
          </UseField>
        </>
      ) : (
        <>
          <EuiSpacer size="s" />
          <EuiLink onClick={() => setShowDescription(true)}>
            {i18n.translate('indexPatternEditor.form.addDescription', {
              defaultMessage: 'Add description',
            })}
          </EuiLink>
        </>
      )}
    </>
  );
};
