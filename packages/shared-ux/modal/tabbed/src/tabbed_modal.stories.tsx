/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiText, EuiCheckboxGroup, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import React, { Fragment } from 'react';

import {
  StorybookMock as TabbedModalStorybookMock,
  type Params as TabbedModalStorybookParams,
} from './storybook/setup';

import { TabbedModal } from './tabbed_modal';
import { IModalTabDeclaration } from './context';

export default {
  title: 'Modal/Tabbed Modal',
  description: 'A controlled modal component that renders tabs',
};

const mock = new TabbedModalStorybookMock();
const argTypes = mock.getArgumentTypes();

export const TrivialExample = (params: TabbedModalStorybookParams) => {
  return (
    <TabbedModal
      {...params}
      modalTitle="Trivial Example"
      tabs={[
        {
          id: 'hello',
          title: 'Hello',
          name: 'hello',
          content: () => {
            return (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiText>
                  <p>Click the button to send a message into the void</p>
                </EuiText>
              </Fragment>
            );
          },
          initialState: {
            message: 'Hello World!!',
          },
          modalActionBtn: {
            id: 'wave',
            dataTestSubj: '',
            formattedMessageId: '',
            defaultMessage: 'Say Hi 👋🏾',
            handler: ({ state }) => {
              alert(state.message);
            },
          },
        },
      ]}
      selectedTabId="hello"
      onClose={() => {}}
    />
  );
};

TrivialExample.argTypes = argTypes;

export const NonTrivialExample = (params: TabbedModalStorybookParams) => {
  const checkboxGroupItemId1 = useGeneratedHtmlId({
    prefix: 'checkboxGroupItem',
    suffix: 'first',
  });
  const checkboxGroupItemId2 = useGeneratedHtmlId({
    prefix: 'checkboxGroupItem',
    suffix: 'second',
  });
  const checkboxGroupItemId3 = useGeneratedHtmlId({
    prefix: 'checkboxGroupItem',
    suffix: 'third',
  });

  const checkboxes = [
    {
      id: checkboxGroupItemId1,
      label: 'Margherita',
      'data-test-sub': 'dts_test',
    },
    {
      id: checkboxGroupItemId2,
      label: 'Diavola',
      className: 'classNameTest',
    },
    {
      id: checkboxGroupItemId3,
      label: 'Hawaiian Pizza',
      disabled: true,
    },
  ];

  enum ACTION_TYPES {
    SelectOption,
  }

  const pizzaSelector: IModalTabDeclaration<{
    checkboxIdToSelectedMap: Record<string, boolean>;
  }> = {
    id: 'order',
    name: 'order',
    initialState: {
      checkboxIdToSelectedMap: {
        [checkboxGroupItemId2]: true,
      },
    },
    reducer(state, action) {
      switch (action.type) {
        case String(ACTION_TYPES.SelectOption):
          return {
            ...state,
            checkboxIdToSelectedMap: action.payload,
          };
        default:
          return state;
      }
    },
    content: ({ state, dispatch }) => {
      const { checkboxIdToSelectedMap } = state;

      const onChange = (optionId) => {
        const newCheckboxIdToSelectedMap = {
          ...checkboxIdToSelectedMap,
          ...{
            [optionId]: !checkboxIdToSelectedMap[optionId],
          },
        };

        dispatch({
          type: String(ACTION_TYPES.SelectOption),
          payload: newCheckboxIdToSelectedMap,
        });
      };

      return (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiText>
            <h3>Select a Pizza (or more)</h3>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiCheckboxGroup
            options={checkboxes}
            idToSelectedMap={checkboxIdToSelectedMap}
            onChange={(id) => onChange(id)}
          />
        </Fragment>
      );
    },
    modalActionBtn: {
      id: 'pizza',
      dataTestSubj: '',
      formattedMessageId: '',
      defaultMessage: 'Order 🍕',
      handler: ({ state }) => {
        alert(JSON.stringify(state));
      },
    },
  };

  // TODO: fix type mismatch
  return (
    <TabbedModal
      {...params}
      onClose={() => {}}
      modalTitle="Non trivial example"
      tabs={[pizzaSelector]}
      selectedTabId="order"
    />
  );
};

NonTrivialExample.argTypes = argTypes;
