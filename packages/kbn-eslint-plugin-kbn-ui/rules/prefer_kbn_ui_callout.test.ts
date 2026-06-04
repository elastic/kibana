/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { PreferKbnUiCallout } from './prefer_kbn_ui_callout';

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

tester.run('prefer_kbn_ui_callout', PreferKbnUiCallout, {
  valid: [
    {
      name: 'using a semantic InfoCallout wrapper component is allowed',
      code: `
        <InfoCallout title="Note" />;
      `,
    },
    {
      name: 'using a semantic SuccessCallout wrapper component is allowed',
      code: `
        <SuccessCallout title="Success" />;
      `,
    },
    {
      name: 'using a semantic WarningCallout wrapper component is allowed',
      code: `
        <WarningCallout title="Warning" />;
      `,
    },
    {
      name: 'using a semantic ErrorCallout wrapper component is allowed',
      code: `
        <ErrorCallout title="Error" />;
      `,
    },
  ],
  invalid: [
    {
      name: 'using <EuiCallOut> without a color prop reports the generic message',
      code: `
        <EuiCallOut title="Note" />;
      `,
      errors: [{ messageId: 'noDirectEuiCallOutJsx' }],
    },
    {
      name: 'using <EuiCallOut color="primary"> suggests InfoCallout',
      code: `
        <EuiCallOut color="primary" title="Note" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'InfoCallout', color: 'primary' },
        },
      ],
    },
    {
      name: 'using <EuiCallOut color="success"> suggests SuccessCallout',
      code: `
        <EuiCallOut color="success" title="Success" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'SuccessCallout', color: 'success' },
        },
      ],
    },
    {
      name: 'using <EuiCallOut color="warning"> suggests WarningCallout',
      code: `
        <EuiCallOut color="warning" title="Warning" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'WarningCallout', color: 'warning' },
        },
      ],
    },
    {
      name: 'using <EuiCallOut color="danger"> suggests ErrorCallout',
      code: `
        <EuiCallOut color="danger" title="Error" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'ErrorCallout', color: 'danger' },
        },
      ],
    },
    {
      name: 'using <EuiCallOut> with a dynamic color expression reports the generic message',
      code: `
        const color = 'primary';
        <EuiCallOut color={color} title="Note" />;
      `,
      errors: [{ messageId: 'noDirectEuiCallOutJsx' }],
    },
  ],
});
