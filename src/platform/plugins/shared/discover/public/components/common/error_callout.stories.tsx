/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DiscoverServicesProvider } from '../../__mocks__/__storybook_mocks__/with_discover_services';
import { ErrorCallout } from './error_callout';

export const _ErrorCallout = () => {
  const sampleError = new Error('This is a sample error message');
  return (
    <DiscoverServicesProvider>
      <ErrorCallout title="Sample Error Title" error={sampleError} />
    </DiscoverServicesProvider>
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
    return (
      <DiscoverServicesProvider>
        <ErrorCallout title="Sample Error Title" error={sampleError} />
      </DiscoverServicesProvider>
    );
  },

  name: 'Error Callout with a very long error message without whitespace',
};
