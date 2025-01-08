/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlock } from '@elastic/eui';
import React from 'react';

interface CodeSnippetProps {
  currentQuery: string;
  callbacks: Record<'sources' | 'fields' | 'policies' | 'metaFields', boolean>;
  ignoreErrors: boolean;
}

function getCallbacksCode(callbacks: CodeSnippetProps['callbacks']) {
  return `({
        ${
          callbacks.sources
            ? `getSources: async () =>
            ['index1', 'anotherIndex', 'dataStream'].map((name) => ({ name, hidden: false })),`
            : ''
        }
        ${
          callbacks.fields
            ? `
        // the getFieldsFor callback gets an esql query to get the required fields
        // note that the query is not optimized yet, so things like "| limit 0"
        // might be appended to speed up the retrieval. 
        getFieldsFor: async (esqlFieldsQuery: string) => [
            { name: 'numberField', type: 'number' },
            { name: 'stringField', type: 'string' },
        ],`
            : ''
        }
        ${
          callbacks.policies
            ? `getPolicies: async () => [
            {
                name: 'my-policy',
                sourceIndices: ['policyIndex'],
                matchField: 'otherStringField',
                enrichFields: ['otherNumberField'],
            },
        ],`
            : ''
        }
})`.replace(/^\s*\n/gm, '');
}

export function CodeSnippet({ currentQuery, callbacks, ignoreErrors }: CodeSnippetProps) {
  return (
    <EuiCodeBlock language="typescript" isCopyable>
      {`
import { ESQLCallbacks, validateQuery } from '@kbn/esql-validation-autocomplete';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';

const currentQuery = "${currentQuery}";

const callbacks: ESQLCallbacks = () => ${getCallbacksCode(callbacks)};

const {errors, warnings} = validateQuery(
    currentQuery,
    getAstAndSyntaxErrors,
    { ignoreOnMissingCallbacks: ${Boolean(ignoreErrors)} },
    callbacks
);
`}
    </EuiCodeBlock>
  );
}
