/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  StorybookMock as TabbedModalStorybookMock,
  type Params as TabbedModalStorybookParams,
} from './storybook/setup';

import { TabbedModal } from './tabbed_modal';

export default {
  title: 'Modal/Tabbed Modal',
  description: 'A controlled modal component that renders tabs',
};

const mock = new TabbedModalStorybookMock();
const argTypes = mock.getArgumentTypes();

export const Modal = (params: TabbedModalStorybookParams) => {
  return (
    <TabbedModal
      {...params}
      modalTitle="Try out!"
      tabs={[
        {
          id: 'hello',
          title: 'Hello',
          content: ({ state, dispatch }) => {
            return <h1>Hello World!!</h1>;
          },
          initialState: {
            age: 42,
          },
          modalActionBtn: {
            label: 'fire 🔥',
            handler: ({ state }) => {
              alert(JSON.stringify(state));
            },
          },
        },
        {
          id: 'pdf',
          title: 'PDF',
          content: ({ state }) => {
            return <h1>PDF!!!</h1>;
          },
          modalActionBtn: {
            label: 'print 🖨️',
            handler: () => alert('printing...'),
          },
        },
      ]}
      selectedTabId=""
    />
  );
};

Modal.argTypes = argTypes;
