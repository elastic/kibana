/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';

// import { ViewMode } from '../../lib';
import userEvent from '@testing-library/user-event';
import { ViewMode } from '../../../common';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
} from '../../lib/test_samples';
import { CustomizePanelAction, EditPanelAction } from '../panel_actions';
import { EmbeddablePanelHeader } from './embeddable_panel_header';

const overlays = overlayServiceMock.createStartContract();
const theme = themeServiceMock.createStartContract();
const editPanelActionMock = { execute: jest.fn() } as unknown as EditPanelAction;

const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
const customizePanelAction = new CustomizePanelAction(overlays, theme, editPanelActionMock);
customizePanelAction.execute = jest.fn();

const DEFAULT_PANEL_TITLE = 'Panel title';

const createEmbeddable = async (
  initialInput?: Partial<ContactCardEmbeddableInput>
): Promise<ContactCardEmbeddable> => {
  return await mockEmbeddableFactory.create({
    id: '20',
    firstName: 'Bilbo',
    lastName: 'Baggins',
    title: DEFAULT_PANEL_TITLE,
    ...initialInput,
  });
};

describe('view mode', () => {
  test('renders as expected', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.VIEW });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{}}
      />
    );
    const titleComponent = await screen.findByTestId('dashboardPanelTitle');
    expect(titleComponent).toHaveTextContent(DEFAULT_PANEL_TITLE);
  });

  test('renders tooltip + icon when description provided', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.VIEW });
    mockEmbeddable.updateOutput({ description: 'This is a description ' });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{}}
      />
    );

    expect(await screen.findByTestId('embeddablePanelTooltipAnchor')).toBeInTheDocument();
    expect(await screen.findByTestId('embeddablePanelTitleDescriptionIcon')).toBeInTheDocument();
  });

  test('blank titles are hidden in view mode', async () => {
    const mockEmbeddable = await createEmbeddable({ title: '', viewMode: ViewMode.VIEW });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{}}
      />
    );

    const header = await screen.findByTestId('embeddablePanelHeading');
    const titleComponent = screen.queryByTestId('dashboardPanelTitle');
    expect(header).not.toContainElement(titleComponent);
  });

  test('hiding an individual panel title hides it in view mode', async () => {
    const mockEmbeddable = await createEmbeddable({
      viewMode: ViewMode.VIEW,
      hidePanelTitles: true,
    });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{}}
      />
    );

    const header = await screen.findByTestId('embeddablePanelHeading');
    const titleComponent = screen.queryByTestId('dashboardPanelTitle');
    expect(header).not.toContainElement(titleComponent);
  });
});

describe('edit mode', () => {
  test('renders as expected', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.EDIT });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{}}
      />
    );
    const titleComponent = await screen.findByTestId('dashboardPanelTitle');
    expect(titleComponent).toHaveTextContent(DEFAULT_PANEL_TITLE);
  });

  test('blank titles render [No title] in edit mode', async () => {
    const mockEmbeddable = await createEmbeddable({ title: '', viewMode: ViewMode.EDIT });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{ customizePanel: customizePanelAction }}
      />
    );
    const titleComponent = await screen.findByTestId('dashboardPanelTitle');
    expect(titleComponent).toHaveTextContent('[No Title]');
  });

  test('hiding an individual panel title renders **only** the context menu button in edit mode', async () => {
    const mockEmbeddable = await createEmbeddable({
      viewMode: ViewMode.EDIT,
      hidePanelTitles: true,
    });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{ customizePanel: customizePanelAction }}
      />
    );
    screen.debug();
    const titleComponent = await screen.findByTestId('embeddablePanelHeading-');
    const innerTitleComponent = await screen.findByTestId('embeddablePanelTitleInner');
    expect(innerTitleComponent).toBeEmptyDOMElement();
    const menuComponent = await screen.findByTestId('embeddablePanelToggleMenuIcon');
    expect(titleComponent).toContainElement(menuComponent);
  });

  test('clicking title calls customize panel action', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.EDIT });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{ customizePanel: customizePanelAction }}
      />
    );
    screen.debug();
    const titleComponent = await screen.findByTestId('embeddablePanelTitleLink');
    userEvent.click(titleComponent);
    expect(customizePanelAction.execute).toBeCalled();
  });
});
