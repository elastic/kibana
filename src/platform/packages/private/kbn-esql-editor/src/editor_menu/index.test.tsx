/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act, render, screen } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { ESQLMenu } from '.';
import { EsqlEditorActionsProvider } from '../editor_actions_context';
import { EsqlEditorActionsRegister } from '../editor_actions_register';

jest.mock('./help_popover', () => {
  const ReactActual = jest.requireActual('react');
  return {
    HelpPopover: (props: { hideRecommendedQueries?: boolean }) =>
      ReactActual.createElement('button', {
        type: 'button',
        'data-test-subj': 'esql-help-popover-button',
        'data-hide-recommended': String(Boolean(props.hideRecommendedQueries)),
      }),
  };
});

const startMock = coreMock.createStart();
startMock.chrome.getActiveSolutionNavId$.mockReturnValue(new BehaviorSubject('oblt'));
startMock.http.get = jest.fn().mockResolvedValue({ recommendedQueries: [] });
startMock.notifications = notificationServiceMock.createStartContract();

const services = { core: startMock, data: { dataViews: {} } };

const renderMenu = async (
  props: React.ComponentProps<typeof ESQLMenu> = {},
  { editorIsInline = false }: { editorIsInline?: boolean } = {}
) =>
  act(async () => {
    render(
      <KibanaContextProvider services={services as any}>
        <EsqlEditorActionsProvider>
          <EsqlEditorActionsRegister editorIsInline={editorIsInline} />
          <ESQLMenu {...props} />
        </EsqlEditorActionsProvider>
      </KibanaContextProvider>
    );
  });

describe('ESQLMenu', () => {
  it('does not render the visor (search) button by default when the editor is not inline', async () => {
    await renderMenu();
    expect(screen.queryByTestId('esql-menu-button')).not.toBeInTheDocument();
  });

  it('renders the visor (search) button when the editor is inline', async () => {
    await renderMenu({}, { editorIsInline: true });
    expect(screen.getByTestId('esql-menu-button')).toBeInTheDocument();
  });

  it('hides the visor (search) button when hideVisor is set, even if inline', async () => {
    await renderMenu({ hideVisor: true }, { editorIsInline: true });
    expect(screen.queryByTestId('esql-menu-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('esql-help-popover-button')).toBeInTheDocument();
  });

  it('forwards hideRecommendedQueries to the help popover', async () => {
    await renderMenu({ hideRecommendedQueries: true });
    expect(screen.getByTestId('esql-help-popover-button')).toHaveAttribute(
      'data-hide-recommended',
      'true'
    );
  });

  it('does not hide recommended queries by default', async () => {
    await renderMenu();
    expect(screen.getByTestId('esql-help-popover-button')).toHaveAttribute(
      'data-hide-recommended',
      'false'
    );
  });
});
