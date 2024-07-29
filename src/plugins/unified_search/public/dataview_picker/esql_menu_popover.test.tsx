/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { ESQLMenuPopover, type ESQLMenuPopoverProps } from './esql_menu_popover';

describe('ESQLMenuPopover', () => {
  let defaultProps: ESQLMenuPopoverProps;

  beforeEach(() => {
    defaultProps = {
      onDataViewSwitch: jest.fn(),
      openESQLInlineDocs: jest.fn(),
    };
  });
  const renderESQLPopover = () => {
    const startMock = coreMock.createStart();
    const services = {
      docLinks: startMock.docLinks,
    };
    return render(
      <KibanaContextProvider services={services}>
        <ESQLMenuPopover {...defaultProps} />{' '}
      </KibanaContextProvider>
    );
  };

  it('should render a button', () => {
    renderESQLPopover();
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
  });

  it('should open a menu when the popover is open', () => {
    renderESQLPopover();
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button'));

    expect(screen.getByTestId('esql-open-docs')).toBeInTheDocument();
    expect(screen.getByTestId('esql-about')).toBeInTheDocument();
    expect(screen.getByTestId('switch-to-dataviews')).toBeInTheDocument();
  });

  it('should call the onDataViewSwitch prop if the switch dataviews CTA is clicked', () => {
    renderESQLPopover();
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByTestId('switch-to-dataviews'));
    expect(defaultProps.onDataViewSwitch).toHaveBeenCalled();
  });

  it('should call the openESQLInlineDocs prop if the open docs CTA is clicked', () => {
    renderESQLPopover();
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByTestId('esql-open-docs'));
    expect(defaultProps.openESQLInlineDocs).toHaveBeenCalled();
  });
});
