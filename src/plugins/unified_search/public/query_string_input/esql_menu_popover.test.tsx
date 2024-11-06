/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { stubIndexPattern } from '@kbn/data-plugin/public/stubs';
import { coreMock } from '@kbn/core/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { ESQLMenuPopover } from './esql_menu_popover';

describe('ESQLMenuPopover', () => {
  const renderESQLPopover = (adHocDataview?: DataView) => {
    const startMock = coreMock.createStart();
    const services = {
      docLinks: startMock.docLinks,
    };
    return render(
      <KibanaContextProvider services={services}>
        <ESQLMenuPopover adHocDataview={adHocDataview} />
      </KibanaContextProvider>
    );
  };

  it('should render a button', () => {
    renderESQLPopover();
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
  });

  it('should open a menu when the popover is open', async () => {
    renderESQLPopover();
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('esql-quick-reference')).toBeInTheDocument();
    expect(screen.queryByTestId('esql-recommended-queries')).not.toBeInTheDocument();
    expect(screen.getByTestId('esql-about')).toBeInTheDocument();
    expect(screen.getByTestId('esql-feedback')).toBeInTheDocument();
  });

  it('should have recommended queries if a dataview is passed', async () => {
    renderESQLPopover(stubIndexPattern);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
  });
});
