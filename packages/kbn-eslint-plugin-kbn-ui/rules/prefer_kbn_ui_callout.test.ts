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
      name: 'using a semantic KbnInfoCallout wrapper component is allowed',
      code: `
        <KbnInfoCallout title="Note" />;
      `,
    },
    {
      name: 'using a semantic KbnSuccessCallout wrapper component is allowed',
      code: `
        <KbnSuccessCallout title="Success" />;
      `,
    },
    {
      name: 'using a semantic KbnWarningCallout wrapper component is allowed',
      code: `
        <KbnWarningCallout title="Warning" />;
      `,
    },
    {
      name: 'using a semantic KbnDangerCallout wrapper component is allowed',
      code: `
        <KbnDangerCallout title="Error" />;
      `,
    },
  ],
  invalid: [
    {
      name: 'using <EuiCallOut> without a color prop suggests KbnInfoCallout (EuiCallOut defaults to primary)',
      code: `
        <EuiCallOut title="Note" />;
      `,
      errors: [{ messageId: 'noDirectEuiCallOutJsx' }],
    },
    {
      name: 'using <EuiCallOut color="primary"> suggests KbnInfoCallout',
      code: `
        <EuiCallOut color="primary" title="Note" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'KbnInfoCallout', color: 'primary' },
        },
      ],
    },
    {
      name: 'using <EuiCallOut color="success"> suggests KbnSuccessCallout',
      code: `
        <EuiCallOut color="success" title="Success" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'KbnSuccessCallout', color: 'success' },
        },
      ],
    },
    {
      name: 'using <EuiCallOut color="warning"> suggests KbnWarningCallout',
      code: `
        <EuiCallOut color="warning" title="Warning" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'KbnWarningCallout', color: 'warning' },
        },
      ],
    },
    {
      name: 'using <EuiCallOut color="danger"> suggests KbnDangerCallout',
      code: `
        <EuiCallOut color="danger" title="Error" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'KbnDangerCallout', color: 'danger' },
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
    {
      name: 'using <EuiCallOut> with spread props',
      code: `
        const props = { color: 'warning' };
        <EuiCallOut {...props} title="Note" />;
      `,
      errors: [{ messageId: 'noDirectEuiCallOutJsxSpread' }],
    },
    {
      name: 'using <EuiCallOut> with spread props and an explicit color use',
      code: `
        <EuiCallOut {...rest} color="danger" title="Error" />;
      `,
      errors: [
        {
          messageId: 'noDirectEuiCallOutJsxWithColor',
          data: { wrapper: 'KbnDangerCallout', color: 'danger' },
        },
      ],
    },
  ],
});
