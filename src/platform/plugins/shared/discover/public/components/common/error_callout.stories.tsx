/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import { ErrorCallout } from '@kbn/discover-utils';
import React from 'react';

const withEui = (children: React.ReactNode) => (
  <EuiProvider highContrastMode={false}>{children}</EuiProvider>
);

export const _ErrorCallout = () => {
  const sampleError = new Error('This is a sample error message');
  return withEui(
    <ErrorCallout
      title="Sample Error Title"
      error={sampleError}
      showErrorDialog={action('showErrorDialog')}
    />
  );
};

export default {
  title: 'components/common/ErrorCallout',
};

export const ErrorCalloutWithAVeryLongErrorMessageWithoutWhitespace = {
  render: () => {
    const sampleError = new Error(
      'ThisIsASampleErrorMessageThisIsASampleErrorMessageThisIsASampleErrorMessageThisIsASampleErrorMessageThisIsASampleErrorMessage'
    );
    return withEui(
      <ErrorCallout
        title="Sample Error Title"
        error={sampleError}
        showErrorDialog={action('showErrorDialog')}
      />
    );
  },

  name: 'Error Callout with a very long error message without whitespace',
};

export const ErrorCalloutEsqlMode = {
  render: () => {
    const sampleError = new Error('ES|QL sample error');
    return withEui(
      <ErrorCallout
        title="Sample Error Title"
        error={sampleError}
        isEsqlMode
        esqlReferenceHref="https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html"
      />
    );
  },

  name: 'Error Callout (ES|QL mode)',
};
