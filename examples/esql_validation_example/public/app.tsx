/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiSpacer,
  EuiFieldText,
  EuiCheckboxGroup,
  EuiFormRow,
  EuiSwitch,
  EuiForm,
  EuiCallOut,
} from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';

import { ESQLCallbacks, ESQLRealField, validateQuery } from '@kbn/esql-validation-autocomplete';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import type { StartDependencies } from './plugin';
import { CodeSnippet } from './code_snippet';

export const App = (props: { core: CoreStart; plugins: StartDependencies }) => {
  const [currentErrors, setErrors] = useState<string[]>([]);
  const [currentWarnings, setWarnings] = useState<string[]>([]);
  const [currentQuery, setQuery] = useState(
    'from index1 | eval var0 = round(numberField, 2) | stats by stringField'
  );

  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const [callbacksEnabled, setCallbacksEnabled] = useState<
    Record<'sources' | 'fields' | 'policies' | 'metaFields', boolean>
  >({
    sources: false,
    fields: true,
    policies: true,
    metaFields: true,
  });

  const callbacks: ESQLCallbacks = useMemo(
    () => ({
      getSources: callbacksEnabled.sources
        ? async () =>
            ['index1', 'anotherIndex', 'dataStream'].map((name) => ({ name, hidden: false }))
        : undefined,
      getFieldsFor: callbacksEnabled.fields
        ? async () =>
            [
              { name: 'doubleField', type: 'double' },
              { name: 'keywordField', type: 'keyword' },
            ] as ESQLRealField[]
        : undefined,
      getPolicies: callbacksEnabled.policies
        ? async () => [
            {
              name: 'my-policy',
              sourceIndices: ['policyIndex'],
              matchField: 'otherStringField',
              enrichFields: ['otherNumberField'],
            },
          ]
        : undefined,
    }),
    [callbacksEnabled]
  );

  useEffect(() => {
    if (currentQuery === '') {
      return;
    }
    validateQuery(
      currentQuery,
      getAstAndSyntaxErrors,
      { ignoreOnMissingCallbacks: ignoreErrors },
      callbacks
    ).then(({ errors: validationErrors, warnings: validationWarnings }) => {
      // syntax errors come with a slight different format than other validation errors
      setErrors(validationErrors.map((e) => ('severity' in e ? e.message : e.text)));
      setWarnings(validationWarnings.map((e) => e.text));
    });
  }, [currentQuery, ignoreErrors, callbacks]);

  const checkboxes = [
    {
      id: 'sources',
      label: 'getSources callback => index1, anotherIndex, dataStream',
    },
    {
      id: 'fields',
      label: 'getFieldsFor callback => numberField, stringField',
    },
    {
      id: 'policies',
      label: 'getPolicies callback => my-policy',
    },
  ];

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 800, margin: '0 auto' }}>
        <EuiPageHeader paddingSize="s" bottomBorder={true} pageTitle="ES|QL validation example" />
        <EuiPageSection paddingSize="s">
          <p>This app shows how to use the ES|QL validation API with all its options</p>

          <EuiSpacer />
          <EuiForm component="form" fullWidth>
            <EuiCheckboxGroup
              options={checkboxes}
              idToSelectedMap={callbacksEnabled}
              onChange={(optionId) => {
                setCallbacksEnabled({
                  ...callbacksEnabled,
                  [optionId]: !callbacksEnabled[optionId as keyof typeof callbacksEnabled],
                });
              }}
            />

            <EuiSpacer />

            <EuiFormRow label="Validation options" hasChildLabel={false}>
              <EuiSwitch
                name="switch"
                label="Ignore errors on missing callback"
                checked={ignoreErrors}
                onChange={() => setIgnoreErrors(!ignoreErrors)}
              />
            </EuiFormRow>
            <EuiSpacer />
            <EuiFormRow
              label="Write the ES|QL query here"
              helpText={currentErrors.length ? '' : 'No errors found'}
              isInvalid={currentErrors.length > 0}
              error={currentErrors}
            >
              <EuiFieldText
                fullWidth
                placeholder="from index1"
                value={currentQuery}
                onChange={(e) => setQuery(e.target.value)}
                isInvalid={currentErrors.length > 0}
              />
            </EuiFormRow>
            {currentWarnings.length ? (
              <EuiCallOut title="Validation warnings" color="warning" iconType="warning">
                <p>Here the list of warnings:</p>
                <ul>
                  {currentWarnings.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </EuiCallOut>
            ) : null}
          </EuiForm>
          <EuiSpacer />
          <CodeSnippet
            currentQuery={currentQuery}
            callbacks={callbacksEnabled}
            ignoreErrors={ignoreErrors}
          />
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
