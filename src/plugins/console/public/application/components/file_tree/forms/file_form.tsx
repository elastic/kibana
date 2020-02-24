/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState } from 'react';
import { EuiButton, EuiFieldText, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';

interface Props {
  initial?: {
    fileName: string;
  };
  onSubmit: (fileName: string) => void;
  isSubmitting: boolean;
}

export const FileForm: FunctionComponent<Props> = ({ onSubmit, isSubmitting, initial }) => {
  const [fileName, setFileName] = useState(initial?.fileName ?? '');
  const [isPristine, setIsPristine] = useState(true);
  const [errors, setErrors] = useState<string | null>(null);
  const isInvalid = Boolean(!isPristine && errors);
  return (
    <>
      <form
        onSubmit={e => {
          if (e) {
            e.preventDefault();
          }
          if (isPristine) {
            setErrors('Please provide a file name');
            return;
          }
          if (!errors) {
            onSubmit(fileName);
          }
        }}
      >
        <EuiFormRow display="rowCompressed" label="Filename">
          <EuiFieldText
            className="conAppFileNameTextField"
            isLoading={isSubmitting}
            compressed
            isInvalid={isInvalid}
            value={fileName}
            onChange={event => {
              if (isPristine) {
                setIsPristine(false);
              }
              const name = event.target.value;
              setErrors(!name ? 'File name is required' : null);
              setFileName(name);
            }}
          />
        </EuiFormRow>
        {errors && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="danger">
              {errors}
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFormRow display="rowCompressed">
          <EuiButton disabled={isSubmitting} size="s" type="submit" fill>
            {!initial
              ? i18n.translate('console.fileTree.forms.createButtonLabel', {
                  defaultMessage: 'Create',
                })
              : i18n.translate('console.fileTree.forms.editButtonLabel', {
                  defaultMessage: 'Edit',
                })}
          </EuiButton>
        </EuiFormRow>
      </form>
    </>
  );
};
