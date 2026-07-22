/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import { PreferToastActionProps } from './prefer_toast_action_props';

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: { jsx: true },
  },
});

// Both mount functions are handled identically by the rule (see MOUNT_FUNCTIONS in the
// implementation), so only the dedicated mount function detection cases below exercise
// both, everything else uses `mount()` since the choice of wrapper doesn't matter to it.
const MOUNT_WRAPPERS = [
  { fn: 'mountReactNode', wrap: (jsx: string) => `mountReactNode(${jsx})` },
  { fn: 'toMountPoint', wrap: (jsx: string) => `toMountPoint(${jsx}, services)` },
];
const mount = MOUNT_WRAPPERS[0].wrap; // default mount wrapper for most test cases

// All toast methods share the same receiver-check code path, so scenarios unrelated to
// method-name matching itself just use `addSuccess`.
const METHODS = ['addSuccess', 'addWarning', 'addInfo', 'addDanger', 'add'];

const ACTION_ELEMENTS = [
  { elementName: 'EuiButton', jsx: '<EuiButton>Reload</EuiButton>' },
  { elementName: 'EuiButtonEmpty', jsx: '<EuiButtonEmpty>Dismiss</EuiButtonEmpty>' },
  { elementName: 'EuiButtonIcon', jsx: '<EuiButtonIcon/>' },
  { elementName: 'button', jsx: '<button>Click</button>' },
  { elementName: 'EuiLink', jsx: '<EuiLink href="/details">View details</EuiLink>' },
];

tester.run('prefer_toast_action_props', PreferToastActionProps, {
  valid: [
    {
      name: 'actionProps usage is allowed',
      code: `toasts.addSuccess({ title: 'Done', actionProps: { primary: { label: 'View' } } });`,
    },
    { name: 'no actionProps field is allowed', code: `toasts.addSuccess({ title: 'Done' });` },
    {
      name: 'non-toast receiver is not flagged',
      code: `someCollection.addSuccess({ text: ${mount('<EuiButton>Action</EuiButton>')} });`,
    },
    {
      name: 'variable aliasing a non-toast receiver is not flagged',
      code: `
        const notifier = someQueue;
        notifier.addSuccess({ text: ${mount('<EuiButton>Action</EuiButton>')} });
      `,
    },
    {
      name: 'non-toast method name is not flagged',
      code: `someService.doSomething({ text: ${mount('<EuiButton>Action</EuiButton>')} });`,
    },
    {
      name: 'custom component is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        '<CustomComponent data={data} />'
      )} });`,
    },
    {
      name: 'action element nested inside an unknown custom container is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `<CustomComponent>
          <EuiButton>Action</EuiButton>
        </CustomComponent>`
      )} });`,
    },
    // EuiLink as inline-text
    {
      name: 'EuiLink as render-function value in FormattedMessage is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `<FormattedMessage
          id="x"
          defaultMessage="Click {link} to continue."
          values={{ link: (chunks) => <EuiLink href="/path">{chunks}</EuiLink> }}
        />`
      )} });`,
    },
    {
      name: 'EuiLink as direct JSX value in FormattedMessage is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `<FormattedMessage
          id="x"
          defaultMessage="See {docs} for details."
          values={{ docs: <EuiLink href="/docs">documentation</EuiLink> }}
        />`
      )} });`,
    },
    {
      name: 'EuiLink inside a paragraph element is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `<p>Visit the <EuiLink href="/docs">documentation</EuiLink> to learn more.</p>`
      )} });`,
    },
    {
      name: 'EuiLink as a sibling of FormattedMessage inside a paragraph is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `<p>
          <FormattedMessage id="x" defaultMessage="Learn more in our docs." />
          <EuiLink href="/docs">docs</EuiLink>
        </p>`
      )} });`,
    },
    {
      name: 'EuiLink as value of FormattedMessage is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `<div>
          <p>
            <FormattedMessage
              id="x"
              defaultMessage="Learn more in our {link}."
              values={{ link: <EuiLink href="/docs">docs</EuiLink> }}
            />
          </p>
        </div>`
      )} });`,
    },
    {
      name: 'EuiLink as a sibling of FormattedMessage is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `<div>
          <FormattedMessage id="x" defaultMessage="Learn more in our docs." />
          <EuiLink href="/docs">docs</EuiLink>
        </div>`
      )} });`,
    },
    // ambiguous/unsupported indirection
    {
      name: 'reassigned variable indirection is not flagged',
      code: `
        let actions = <EuiButton>Reload</EuiButton>;
        actions = null;
        toasts.addSuccess({ title: 'Done', text: ${mount('actions')} });
      `,
    },
    {
      name: 'function parameter indirection is not flagged',
      code: `
        function showToast(actions) {
          toasts.addSuccess({ title: 'Done', text: ${mount('actions')} });
        }
      `,
    },
    {
      name: 'local render helper call is not flagged (not traversed, same as custom components)',
      code: `
        const renderActions = () => <EuiButton>Reload</EuiButton>;
        toasts.addSuccess({ title: 'Done', text: ${mount('renderActions()')} });
      `,
    },
    {
      name: 'conditional text with no mount call in either branch is not flagged',
      code: `toasts.addSuccess({ title: 'Done', text: isMobile ? 'short text' : 'long text' });`,
    },
    {
      name: 'plain text in children is not flagged',
      code: `toasts.addSuccess({ title: 'Done', children: 'Some additional context' });`,
    },
    {
      name: 'custom component in children is not flagged',
      code: `toasts.addSuccess({ title: 'Done', children: <CustomComponent data={data} /> });`,
    },
  ],
  invalid: [
    // supported mount functions
    ...MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
      name: `EuiButton inside ${fn} is flagged`,
      code: `toasts.addSuccess({ title: 'Title', text: ${wrap(
        '<EuiButton>Reload</EuiButton>'
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: fn },
        },
      ],
    })),
    // every action element
    ...ACTION_ELEMENTS.map(({ elementName, jsx }) => ({
      name: `${elementName} is flagged`,
      code: `toasts.addSuccess({ title: 'Title', text: ${mount(jsx)} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName, method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    })),
    // every toast method
    ...METHODS.map((method) => ({
      name: `toasts.${method}() is flagged`,
      code: `toasts.${method}({ title: 'Title', text: ${mount(
        '<EuiButton>Reload</EuiButton>'
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method, mountFn: 'mountReactNode' },
        },
      ],
    })),
    {
      name: 'notifications.toasts.addSuccess() is flagged',
      code: `notifications.toasts.addSuccess({ title: 'Title', text: ${mount(
        '<EuiButton>Reload</EuiButton>'
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    {
      name: 'addSuccess() on a variable aliasing notifications.toasts is flagged',
      code: `
        const toastService = notifications.toasts;
        toastService.addSuccess({ title: 'Done', text: ${mount('<EuiButton>Reload</EuiButton>')} });
      `,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // toasts receiver chained aliasing
    {
      name: 'addSuccess() on a chained alias of toasts is flagged',
      code: `
        const a = toasts;
        const b = a;
        b.addSuccess({ title: 'Done', text: ${mount('<EuiButton>Reload</EuiButton>')} });
      `,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // action element nested inside transparent containers
    {
      name: 'action nested inside EuiFlexGroup/EuiFlexItem is flagged',
      code: `
        toasts.addSuccess({
          title: 'Saved',
          text: ${mount(
            `<EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
              <EuiButton>Reload</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>`
          )},
        });
      `,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // logical expressions
    {
      name: 'EuiButton inside a logical expression is flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `show && <EuiButton>View</EuiButton>`
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // conditional expressions
    {
      name: 'EuiButton in conditional consequent is flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `show ? <EuiButton>View</EuiButton> : null`
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // action alongside a single paragraph
    {
      name: 'action is flagged with single text content',
      code: `
        notifications.toasts.addSuccess({
          title: 'System color mode updated',
          text: ${mount(
            `<>
              <p>Reload the page to see the changes</p>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton>Reload page</EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>`
          )},
        });
      `,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // action alongside multiple paragraphs
    {
      name: 'action is flagged with multiple text content',
      code: `
        toasts.addSuccess({
          title: 'Done',
          text: ${mount(
            `<>
              <p>First paragraph.</p>
              <p>Second paragraph.</p>
              <EuiButton>View</EuiButton>
            </>`
          )},
        });
      `,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // EuiLink as a standalone CTA is flagged
    {
      name: 'standalone EuiLink CTA after body text is flagged',
      code: `
        toasts.addWarning({
          title: 'Setup required',
          text: ${mount(
            `<div>
              <p>Additional configuration is required before you can proceed.</p>
              <EuiLink href="/settings">Learn how.</EuiLink>
            </div>`
          )},
        });
      `,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiLink', method: 'addWarning', mountFn: 'mountReactNode' },
        },
      ],
    },
    // action element nested inside a paragraph
    {
      name: 'EuiButton nested inside a paragraph is flagged',
      code: `toasts.addSuccess({ title: 'Done', text: ${mount(
        `<p>
          <span>Some text</span>
          <EuiButton>Click</EuiButton>
          <span>Some more text</span>
        </p>`
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    {
      name: 'standalone EuiLink CTA as sole content of a paragraph is flagged',
      code: `toasts.addWarning({ title: 'Setup required', text: ${mount(
        `<p>
          <EuiLink href="/settings">Learn how.</EuiLink>
        </p>`
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiLink', method: 'addWarning', mountFn: 'mountReactNode' },
        },
      ],
    },
    // variable indirection
    {
      name: 'action as standalone variable is flagged',
      code: `
        const actions = <EuiButton>Reload</EuiButton>;
        toasts.addSuccess({ title: 'Done', text: ${mount('actions')} });
      `,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // chained variable indirection
    {
      name: 'action as chained variable is flagged',
      code: `
        const button = <EuiButton>Reload</EuiButton>;
        const content = button;
        toasts.addSuccess({ title: 'Done', text: ${mount('content')} });
      `,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // mount call with logical expression
    {
      name: 'mount call in a conditional consequent is flagged',
      code: `toasts.addSuccess({ title: 'Done', text: isMobile ? ${mount(
        '<EuiButton>Retry</EuiButton>'
      )} : 'plain text' });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    {
      name: 'mount call in a logical expression is flagged',
      code: `toasts.addSuccess({ title: 'Done', text: showAction && ${mount(
        '<EuiButton>Retry</EuiButton>'
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    {
      name: 'mount calls in both conditional branches are each flagged',
      code: `toasts.addSuccess({ title: 'Done', text: isMobile ? ${mount(
        '<EuiButton>A</EuiButton>'
      )} : ${mount('<EuiButton>B</EuiButton>')} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: 'mountReactNode' },
        },
      ],
    },
    // action element passed directly via `children` (no mount call needed)
    {
      name: 'action element in children is flagged',
      code: `toasts.addSuccess({ title: 'Done', children: <EuiButton>Retry</EuiButton> });`,
      errors: [
        {
          messageId: 'actionElementInChildren',
          data: { elementName: 'EuiButton', method: 'addSuccess' },
        },
      ],
    },
    {
      name: 'action element nested in a container inside children is flagged',
      code: `
        toasts.addSuccess({
          title: 'Done',
          children: (
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton>Retry</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        });
      `,
      errors: [
        {
          messageId: 'actionElementInChildren',
          data: { elementName: 'EuiButton', method: 'addSuccess' },
        },
      ],
    },
  ],
});
