/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { DataView } from '@kbn/data-views-plugin/common';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { PublishesDataViews, PublishesViewMode, ViewMode } from '@kbn/presentation-publishing';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useImperativeHandle } from 'react';
import { BehaviorSubject } from 'rxjs';
import { PresentationPanel } from '.';
import { uiActions } from '../kibana_services';
import { getMockPresentationPanelCompatibleComponent } from '../mocks';
import * as openCustomizePanel from '../panel_actions/customize_panel_action/open_customize_panel';
import {
  DefaultPresentationPanelApi,
  PanelCompatibleComponent,
  PresentationPanelInternalProps,
} from './types';

describe('Presentation panel', () => {
  const editPanelSpy = jest.spyOn(openCustomizePanel, 'openCustomizePanelFlyout');

  const renderPresentationPanel = async ({
    props,
    api,
  }: {
    props?: Omit<PresentationPanelInternalProps, 'Component'>;
    api?: DefaultPresentationPanelApi;
  }) => {
    render(
      <PresentationPanel {...props} Component={getMockPresentationPanelCompatibleComponent(api)} />
    );
    await waitFor(() => {
      expect(screen.getByTestId('embeddablePanel')).toBeInTheDocument();
    });
  };

  it('renders internal component', async () => {
    render(<PresentationPanel Component={getMockPresentationPanelCompatibleComponent()} />);
    await waitFor(() =>
      expect(screen.getByTestId('testPresentationPanelInternalComponent')).toBeInTheDocument()
    );
  });

  it('renders a blocking error when one is present', async () => {
    const api: DefaultPresentationPanelApi = {
      uuid: 'test',
      blockingError$: new BehaviorSubject<Error | undefined>(new Error('UH OH')),
    };
    render(<PresentationPanel Component={getMockPresentationPanelCompatibleComponent(api)} />);
    await waitFor(() => expect(screen.getByTestId('embeddableStackError')).toBeInTheDocument());
  });

  it('renders error boundary when internal component throws during rendering', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
    function ComponentThatThrows() {
      throw new Error('simulated error during rendering');
      return <div />;
    }
    function getComponent(api?: DefaultPresentationPanelApi): Promise<PanelCompatibleComponent> {
      return Promise.resolve(
        React.forwardRef((_, apiRef) => {
          useImperativeHandle(apiRef, () => api ?? { uuid: 'test' });
          return <ComponentThatThrows />;
        })
      );
    }
    render(<PresentationPanel Component={getComponent()} />);
    await waitFor(() => expect(screen.getByTestId('euiErrorBoundary')).toBeInTheDocument());
  });

  describe('actions', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    const mockAction = (id: string) => ({
      isCompatible: jest.fn().mockResolvedValue(true),
      getDisplayName: () => id,
      getIconType: jest.fn(),
      execute: jest.fn(),
      id,
    });

    it('gets compatible actions for the given API', async () => {
      const api: DefaultPresentationPanelApi = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('superTest'),
      };
      await renderPresentationPanel({ api });
      expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledWith('CONTEXT_MENU_TRIGGER', {
        embeddable: api,
      });
      expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledWith('PANEL_BADGE_TRIGGER', {
        embeddable: api,
      });
      expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledWith(
        'PANEL_NOTIFICATION_TRIGGER',
        { embeddable: api }
      );
    });

    it('calls the custom getActions function when one is provided', async () => {
      const getActions = jest.fn().mockReturnValue([]);
      await renderPresentationPanel({ props: { getActions } });
      expect(getActions).toHaveBeenCalledTimes(3);
      expect(uiActions.getTriggerCompatibleActions).toHaveBeenCalledTimes(0);
    });

    it('does not show actions which are disabled by the API', async () => {
      const api: DefaultPresentationPanelApi = {
        uuid: 'test',
        disabledActionIds$: new BehaviorSubject<string[] | undefined>(['actionA']),
      };
      const getActions = jest.fn().mockReturnValue([mockAction('actionA'), mockAction('actionB')]);
      await renderPresentationPanel({ api, props: { getActions } });
      await userEvent.click(screen.getByTestId('embeddablePanelToggleMenuIcon'));
      await waitForEuiPopoverOpen();
      await waitFor(() => {
        expect(screen.getByTestId('embeddablePanelContextMenuOpen')).toBeInTheDocument();
        expect(screen.getByTestId('presentationPanelContextMenuItems')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('embeddablePanelAction-actionB')).toBeInTheDocument();
      expect(screen.queryByTestId('embeddablePanelAction-actionA')).not.toBeInTheDocument();
    });

    it('shows badges and notifications', async () => {
      const testAction = mockAction('testAction');
      const getActions = jest.fn().mockReturnValue([testAction]);
      await renderPresentationPanel({ props: { getActions } });
      expect(screen.queryByTestId('embeddablePanelBadge-testAction')).toBeInTheDocument();
      expect(screen.queryByTestId('embeddablePanelNotification-testAction')).toBeInTheDocument();
    });

    it('does not show badges when showBadges is false', async () => {
      const testAction = mockAction('testAction');
      const getActions = jest.fn().mockReturnValue([testAction]);
      await renderPresentationPanel({ props: { getActions, showBadges: false } });
      expect(screen.queryByTestId('embeddablePanelBadge-testAction')).not.toBeInTheDocument();
      expect(screen.queryByTestId('embeddablePanelNotification-testAction')).toBeInTheDocument();
    });

    it('does not show notifications when showNotifications is false', async () => {
      const testAction = mockAction('testAction');
      const getActions = jest.fn().mockReturnValue([testAction]);
      await renderPresentationPanel({ props: { getActions, showNotifications: false } });
      expect(screen.queryByTestId('embeddablePanelBadge-testAction')).toBeInTheDocument();
      expect(
        screen.queryByTestId('embeddablePanelNotification-testAction')
      ).not.toBeInTheDocument();
    });
  });

  describe('titles', () => {
    it('renders the panel title from the api and not the default title', async () => {
      const api: DefaultPresentationPanelApi = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
        defaultTitle$: new BehaviorSubject<string | undefined>('SO Title'),
      };
      await renderPresentationPanel({ api });
      await waitFor(() => {
        expect(screen.getByTestId('embeddablePanelTitle')).toHaveTextContent('SUPER TITLE');
      });
    });

    it('renders the default title from the api when a panel title is not provided', async () => {
      const api: DefaultPresentationPanelApi = {
        uuid: 'test',
        defaultTitle$: new BehaviorSubject<string | undefined>('SO Title'),
      };
      await renderPresentationPanel({ api });
      await waitFor(() => {
        expect(screen.getByTestId('embeddablePanelTitle')).toHaveTextContent('SO Title');
      });
    });

    it("does not render an info icon when the api doesn't provide a panel description or default description", async () => {
      const api: DefaultPresentationPanelApi = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
      };
      await renderPresentationPanel({ api });
      await waitFor(() => {
        expect(screen.queryByTestId('embeddablePanelTitleDescriptionIcon')).toBe(null);
      });
    });

    it('renders an info icon when the api provides a panel description', async () => {
      const api: DefaultPresentationPanelApi = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
        description$: new BehaviorSubject<string | undefined>('SUPER DESCRIPTION'),
      };
      await renderPresentationPanel({ api });
      await waitFor(() => {
        expect(screen.getByTestId('embeddablePanelTitleDescriptionIcon')).toBeInTheDocument();
      });
    });

    it('renders an info icon when the api provides a default description', async () => {
      const api: DefaultPresentationPanelApi = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
        defaultDescription$: new BehaviorSubject<string | undefined>('SO Description'),
      };
      await renderPresentationPanel({ api });
      await waitFor(() => {
        expect(screen.getByTestId('embeddablePanelTitleDescriptionIcon')).toBeInTheDocument();
      });
    });

    it('does not render a title when in view mode when the provided title is blank', async () => {
      const api: DefaultPresentationPanelApi & PublishesViewMode = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>(''),
        viewMode$: new BehaviorSubject<ViewMode>('view'),
      };
      await renderPresentationPanel({ api });
      expect(screen.queryByTestId('presentationPanelTitle')).not.toBeInTheDocument();
    });

    it('does not render a title when in edit mode and the provided title is blank', async () => {
      const api: DefaultPresentationPanelApi & PublishesDataViews & PublishesViewMode = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>(''),
        viewMode$: new BehaviorSubject<ViewMode>('edit'),
        dataViews$: new BehaviorSubject<DataView[] | undefined>([]),
      };
      await renderPresentationPanel({ api });
      expect(screen.queryByTestId('presentationPanelTitle')).not.toBeInTheDocument();
    });

    it('opens customize panel flyout on title click when in edit mode', async () => {
      editPanelSpy.mockClear();

      const api: DefaultPresentationPanelApi & PublishesDataViews & PublishesViewMode = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('TITLE'),
        viewMode$: new BehaviorSubject<ViewMode>('edit'),
        dataViews$: new BehaviorSubject<DataView[] | undefined>([]),
      };
      await renderPresentationPanel({ api });
      await waitFor(() => {
        expect(screen.getByTestId('embeddablePanelTitle')).toBeInTheDocument();
      });
      const titleElement = screen.getByTestId('embeddablePanelTitle');
      expect(titleElement).toHaveTextContent('TITLE');
      expect(titleElement.nodeName).toBe('BUTTON');

      await userEvent.click(titleElement);
      expect(editPanelSpy).toHaveBeenCalled();
    });

    it('does not show title customize link in view mode', async () => {
      editPanelSpy.mockClear();

      const api: DefaultPresentationPanelApi & PublishesDataViews & PublishesViewMode = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
        viewMode$: new BehaviorSubject<ViewMode>('view'),
        dataViews$: new BehaviorSubject<DataView[] | undefined>([]),
      };
      await renderPresentationPanel({ api });
      await waitFor(() => {
        expect(screen.getByTestId('embeddablePanelTitle')).toBeInTheDocument();
      });
      const titleElement = screen.getByTestId('embeddablePanelTitle');
      expect(titleElement).toHaveTextContent('SUPER TITLE');
      expect(titleElement.nodeName).toBe('SPAN');

      await userEvent.click(titleElement);
      expect(editPanelSpy).not.toHaveBeenCalled();
    });

    it('hides title in view mode when API hide title option is true', async () => {
      const api: DefaultPresentationPanelApi & PublishesViewMode = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
        hideTitle$: new BehaviorSubject<boolean | undefined>(true),
        viewMode$: new BehaviorSubject<ViewMode>('view'),
      };
      await renderPresentationPanel({ api });
      expect(screen.queryByTestId('presentationPanelTitle')).not.toBeInTheDocument();
    });

    it('hides title in edit mode when API hide title option is true', async () => {
      const api: DefaultPresentationPanelApi & PublishesViewMode = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
        hideTitle$: new BehaviorSubject<boolean | undefined>(true),
        viewMode$: new BehaviorSubject<ViewMode>('edit'),
      };
      await renderPresentationPanel({ api });
      expect(screen.queryByTestId('presentationPanelTitle')).not.toBeInTheDocument();
    });

    it('hides title in view mode when parent hide title option is true', async () => {
      const api: DefaultPresentationPanelApi & PublishesViewMode = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
        viewMode$: new BehaviorSubject<ViewMode>('view'),
        parentApi: {
          viewMode$: new BehaviorSubject<ViewMode>('view'),
          ...getMockPresentationContainer(),
        },
      };
      await renderPresentationPanel({ api });
      expect(screen.queryByTestId('presentationPanelTitle')).not.toBeInTheDocument();
    });

    it('hides title in edit mode when parent hide title option is true', async () => {
      const api: DefaultPresentationPanelApi & PublishesViewMode = {
        uuid: 'test',
        title$: new BehaviorSubject<string | undefined>('SUPER TITLE'),
        viewMode$: new BehaviorSubject<ViewMode>('edit'),
        parentApi: {
          viewMode$: new BehaviorSubject<ViewMode>('edit'),
          ...getMockPresentationContainer(),
        },
      };
      await renderPresentationPanel({ api });
      expect(screen.queryByTestId('presentationPanelTitle')).not.toBeInTheDocument();
    });
  });
});
