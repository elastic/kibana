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

const MOUNT_WRAPPERS = [
  { fn: 'mountReactNode', wrap: (jsx: string) => `mountReactNode(${jsx})` },
  { fn: 'toMountPoint', wrap: (jsx: string) => `toMountPoint(${jsx}, services)` },
];

const METHODS = [
  { method: 'addSuccess', receivers: ['toasts'] },
  { method: 'addWarning', receivers: ['toasts'] },
  { method: 'addInfo', receivers: ['toasts'] },
  { method: 'addDanger', receivers: ['toasts'] },
  { method: 'add', receivers: ['toasts', 'notifications.toasts'] },
];

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
    ...MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
      name: `generic .add() on non-toast receiver with ${fn} is not flagged`,
      code: `someCollection.add({ text: ${wrap('<EuiButton>Action</EuiButton>')} });`,
    })),
    ...MOUNT_WRAPPERS.flatMap(({ fn, wrap }) => [
      {
        name: `custom component inside ${fn} is not flagged`,
        code: `toasts.addSuccess({ title: 'Done', text: ${wrap(
          '<CustomComponent data={data} />'
        )} });`,
      },
      {
        name: `action element nested inside an unknown custom container in ${fn} is not flagged`,
        code: `toasts.addSuccess({ title: 'Done', text: ${wrap(
          `<CustomComponent>
            <EuiButton>Action</EuiButton>
          </CustomComponent>`
        )} });`,
      },
      {
        name: `non-toast method is not flagged`,
        code: `someService.doSomething({ text: ${wrap('<EuiButton>Action</EuiButton>')} });`,
      },
    ]),
  ],
  invalid: [
    // check each action element with each MountPoint wrapper
    ...ACTION_ELEMENTS.flatMap(({ elementName, jsx }) =>
      MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
        name: `${elementName} inside ${fn} is flagged`,
        code: `toasts.addSuccess({ title: 'Title', text: ${wrap(jsx)} });`,
        errors: [
          {
            messageId: 'actionElementInMountContent',
            data: { elementName, method: 'addSuccess', mountFn: fn },
          },
        ],
      }))
    ),
    // check each method with each MountPoint wrapper
    ...METHODS.flatMap(({ method, receivers }) =>
      receivers.flatMap((receiver) =>
        MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
          name: `${receiver}.${method}() is flagged in ${fn}`,
          code: `${receiver}.${method}({ title: 'Title', text: ${wrap(
            '<EuiButton>Reload</EuiButton>'
          )} });`,
          errors: [
            {
              messageId: 'actionElementInMountContent',
              data: { elementName: 'EuiButton', method, mountFn: fn },
            },
          ],
        }))
      )
    ),
    // action element nested inside transparent containers
    ...MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
      name: `action nested inside EuiFlexGroup/EuiFlexItem in ${fn} is flagged`,
      code: `
        toasts.addSuccess({
          title: 'Saved',
          text: ${wrap(
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
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: fn },
        },
      ],
    })),
    // logical expressions
    ...MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
      name: `EuiButton inside a logical expression in ${fn} is flagged`,
      code: `toasts.addSuccess({ title: 'Done', text: ${wrap(
        `show && <EuiButton>View</EuiButton>`
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: fn },
        },
      ],
    })),
    // conditional expressions
    ...MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
      name: `EuiButton in conditional consequent in ${fn} is flagged`,
      code: `toasts.addSuccess({ title: 'Done', text: ${wrap(
        `show ? <EuiButton>View</EuiButton> : null`
      )} });`,
      errors: [
        {
          messageId: 'actionElementInMountContent',
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: fn },
        },
      ],
    })),
    // action alongside a single paragraph
    ...MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
      name: `action is flagged in ${fn} with single text content`,
      code: `
        notifications.toasts.addSuccess({
          title: 'System color mode updated',
          text: ${wrap(
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
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: fn },
        },
      ],
    })),
    // action alongside multiple paragraphs
    ...MOUNT_WRAPPERS.map(({ fn, wrap }) => ({
      name: `action is flagged in ${fn} with multiple text content`,
      code: `
        toasts.addSuccess({
          title: 'Done',
          text: ${wrap(
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
          data: { elementName: 'EuiButton', method: 'addSuccess', mountFn: fn },
        },
      ],
    })),
  ],
});
