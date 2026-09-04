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
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { DefaultPresentationPanelApi } from '../types';
import {
  createClickHandler,
  PresentationPanelHoverActions,
} from './presentation_panel_hover_actions';

jest.mock('../../../kibana_services', () => ({
  uiActions: {
    getFrequentlyChangingActionsForTrigger: jest.fn().mockResolvedValue([]),
    getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
  },
}));

describe('createClickHandler', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const buildAction = () => ({ execute: jest.fn() } as unknown as Action<EmbeddableApiContext>);
  const context = {} as ActionExecutionContext<EmbeddableApiContext>;

  const buildEvent = (currentTarget: HTMLElement) =>
    ({
      currentTarget,
      button: 0,
      defaultPrevented: false,
      preventDefault: jest.fn(),
    } as unknown as React.MouseEvent);

  it('executes the action', () => {
    const action = buildAction();
    const button = document.createElement('button');
    document.body.appendChild(button);

    createClickHandler(action, context)(buildEvent(button));

    expect(action.execute).toHaveBeenCalledWith(context);
  });

  it('keeps focus on the triggering button so the opened overlay can return focus to it', () => {
    // Regression guard for WCAG 2.4.3: the handler must not blur the trigger,
    // otherwise the element focus should be returned to is destroyed before the
    // action's flyout opens.
    const action = buildAction();
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    expect(document.activeElement).toBe(button);

    createClickHandler(action, context)(buildEvent(button));

    expect(document.activeElement).toBe(button);
  });
});

describe('PresentationPanelHoverActions', () => {
  // The hover actions bar only renders when there is at least one quick action,
  // so give it one from the default view-mode list.
  const buildQuickAction = () =>
    ({
      id: 'openInspector',
      order: 1,
      getDisplayName: () => 'Inspect',
      getIconType: () => 'inspect',
      isCompatible: async () => true,
      execute: jest.fn(),
    } as unknown as Action<EmbeddableApiContext>);

  it('keeps line breaks in the description shown when the title is hidden', async () => {
    const api: DefaultPresentationPanelApi = {
      uuid: 'test-panel',
      title$: new BehaviorSubject<string | undefined>(undefined),
      description$: new BehaviorSubject<string | undefined>(
        'What it counts: CPU time.\nDiagnostic use: spot busy hosts.'
      ),
    };

    const { container } = render(
      <EuiThemeProvider>
        <PresentationPanelHoverActions
          api={api}
          getActions={jest.fn().mockResolvedValue([buildQuickAction()])}
          setDragHandle={jest.fn()}
        />
      </EuiThemeProvider>
    );

    await screen.findByTestId('hover-actions-test-panel');

    const descriptionIcon = container.querySelector('[data-euiicon-type="info"]');
    expect(descriptionIcon).not.toBeNull();
    fireEvent.mouseOver(descriptionIcon!.closest('.euiToolTipAnchor')!);

    const description = await screen.findByTestId('embeddablePanelDescription');
    expect(description).toHaveStyle('white-space: pre-line');
    expect(description.textContent).toContain('\n');
  });
});
