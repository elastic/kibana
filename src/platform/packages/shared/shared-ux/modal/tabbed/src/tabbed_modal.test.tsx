/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { EuiFieldText } from '@elastic/eui';
import { TabbedModal, type IModalTabDeclaration } from './tabbed_modal';

describe('TabbedModal', () => {
  const modalOnCloseHandler = jest.fn();

  describe('modal configuration', () => {
    const mockedHandlerFn = jest.fn();

    const tabDefinition: IModalTabDeclaration<{
      inputText: string;
    }> = {
      id: 'logUserInput',
      name: 'log user input',
      reducer(state = { inputText: '' }, action) {
        switch (action.type) {
          case 'UPDATE_TEXT_VALUE':
            return {
              ...state,
              inputText: action.payload,
            };
          default:
            return state;
        }
      },
      content: ({ state, dispatch }) => {
        const onChange = (e: { target: { value: any } }) => {
          dispatch({ type: 'UPDATE_TEXT_VALUE', payload: e.target.value });
        };

        return (
          <EuiFieldText
            data-test-subj="log-user-input-field"
            placeholder="Placeholder text"
            value={state.inputText}
            onChange={onChange}
            aria-label="Use aria labels when no actual label is in use"
          />
        );
      },
      modalActionBtn: {
        id: 'logUserMessage',
        dataTestSubj: 'log-user-message',
        label: 'log user message',
        handler: mockedHandlerFn,
      },
    };

    it("when a single tab definition is passed it simply renders it's content into the modal component without tabs", async () => {
      render(
        <TabbedModal
          tabs={[tabDefinition]}
          defaultSelectedTabId="logUserInput"
          onClose={modalOnCloseHandler}
        />
      );

      expect(screen.queryByText(tabDefinition.name)).not.toBeInTheDocument();

      expect(screen.getByTestId('log-user-input-field')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId(tabDefinition.modalActionBtn!.dataTestSubj));

      expect(mockedHandlerFn).toHaveBeenCalled();
    });

    it('renders the tabbed modal with tabs for tab definition with length greater than 1', async () => {
      render(
        <TabbedModal
          tabs={[tabDefinition, { ...tabDefinition, id: 'anotherTab', name: 'another tab' }]}
          defaultSelectedTabId="logUserInput"
          onClose={modalOnCloseHandler}
        />
      );

      expect(screen.queryByText(tabDefinition.name)).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId(tabDefinition.modalActionBtn!.dataTestSubj));

      expect(mockedHandlerFn).toHaveBeenCalled();
    });
  });
});
