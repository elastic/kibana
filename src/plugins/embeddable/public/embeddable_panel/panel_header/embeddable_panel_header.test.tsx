/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import userEvent from '@testing-library/user-event';
import { ViewMode } from '../../../common';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
} from '../../lib/test_samples';
import { EditPanelAction } from '../panel_actions';
import * as openCustomizePanel from '../panel_actions/customize_panel_action/open_customize_panel';
import { EmbeddablePanelHeader } from './embeddable_panel_header';

const getEmbeddableFactory = jest.fn();
const application = applicationServiceMock.createStartContract();

const editPanelAction = new EditPanelAction(getEmbeddableFactory, application);
const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
editPanelAction.execute = jest.fn();

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
        universalActions={{ editPanel: editPanelAction }}
      />
    );
    const titleComponent = await screen.findByTestId('embeddablePanelTitleInner');
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
        universalActions={{ editPanel: editPanelAction }}
      />
    );
    const titleComponent = await screen.findByTestId('embeddablePanelHeading-');
    const innerTitleComponent = await screen.findByTestId('embeddablePanelTitleInner');
    expect(innerTitleComponent).toBeEmptyDOMElement();
    const menuComponent = await screen.findByTestId('embeddablePanelToggleMenuIcon');
    expect(titleComponent).toContainElement(menuComponent);
  });

  test('clicking title opens customize panel flyout', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.EDIT });
    render(
      <EmbeddablePanelHeader
        embeddable={mockEmbeddable}
        headerId={'headerId'}
        universalActions={{ editPanel: editPanelAction }}
      />
    );
    const titleComponent = await screen.findByTestId('embeddablePanelTitleLink');

    const spy = jest.spyOn(openCustomizePanel, 'openCustomizePanelFlyout');
    userEvent.click(titleComponent);
    expect(spy).toHaveBeenCalled();
  });
});
