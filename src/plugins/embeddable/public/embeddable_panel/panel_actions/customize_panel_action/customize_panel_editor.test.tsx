/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

import { Filter } from '@kbn/es-query';
import { ViewMode } from '../../../../common';
import { FilterableEmbeddable, IEmbeddable } from '../../../lib';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
} from '../../../lib/test_samples';
import { EditPanelAction } from '../edit_panel_action/edit_panel_action';
import { CustomizePanelAction } from './customize_panel_action';
import { CustomizePanelEditor } from './customize_panel_editor';

const editPanelActionMock = { execute: jest.fn() } as unknown as EditPanelAction;

const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
const customizePanelAction = new CustomizePanelAction(editPanelActionMock);
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

const DEFAULT_PROPS = {
  timeRangeCompatible: true,
  onClose: jest.fn(),
  onEdit: jest.fn(),
};

describe('panel title / description', () => {
  test('does not render if in view mode', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.VIEW });
    render(
      <IntlProvider locale="en">
        <CustomizePanelEditor {...DEFAULT_PROPS} embeddable={mockEmbeddable} />
      </IntlProvider>
    );

    const customizePanelForm = await screen.findByTestId('customizePanelForm');
    const titleDescriptionComponent = screen.queryByTestId('customEmbeddableTitleComponent');
    expect(customizePanelForm).not.toContainElement(titleDescriptionComponent);
  });

  test('title input receives focus when `focusOnTitle` is `true`', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.EDIT });
    render(
      <IntlProvider locale="en">
        <CustomizePanelEditor {...DEFAULT_PROPS} embeddable={mockEmbeddable} focusOnTitle={true} />
      </IntlProvider>
    );

    const customTitleComponent = await screen.findByTestId('customEmbeddablePanelTitleInput');
    expect(customTitleComponent).toHaveFocus();
  });

  test('title input does not receive focus when `focusOnTitle` is `false`', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.EDIT });
    render(
      <IntlProvider locale="en">
        <CustomizePanelEditor {...DEFAULT_PROPS} embeddable={mockEmbeddable} focusOnTitle={false} />
      </IntlProvider>
    );

    const customTitleComponent = await screen.findByTestId('customEmbeddablePanelTitleInput');
    expect(customTitleComponent).not.toHaveFocus();
  });
});

describe('custom time picker', () => {
  test('renders custom time picker if embeddable supports it', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.EDIT });
    render(
      <IntlProvider locale="en">
        <CustomizePanelEditor
          {...DEFAULT_PROPS}
          embeddable={mockEmbeddable}
          timeRangeCompatible={true}
        />
      </IntlProvider>
    );

    const customTimeRangeComponent = await screen.findByTestId('customizePanelTimeRangeDatePicker');
    expect(customTimeRangeComponent).toBeDefined();
  });

  test('does not render custom time picker if embeddable does not support it', async () => {
    const mockEmbeddable = await createEmbeddable({ viewMode: ViewMode.EDIT });
    render(
      <IntlProvider locale="en">
        <CustomizePanelEditor
          {...DEFAULT_PROPS}
          embeddable={mockEmbeddable}
          timeRangeCompatible={false}
        />
      </IntlProvider>
    );

    const customizePanelForm = await screen.findByTestId('customizePanelForm');
    const customTimeRangeComponent = screen.queryByTestId('customizePanelTimeRangeDatePicker');
    expect(customizePanelForm).not.toContainElement(customTimeRangeComponent);
  });

  test('does not render filters and/or query info if embeddable does not support it', async () => {
    const mockEmbeddable = await createEmbeddable({
      viewMode: ViewMode.EDIT,
    });

    render(
      <IntlProvider locale="en">
        <CustomizePanelEditor
          {...DEFAULT_PROPS}
          embeddable={mockEmbeddable as unknown as IEmbeddable}
          timeRangeCompatible={false}
        />
      </IntlProvider>
    );

    const customizePanelForm = await screen.findByTestId('customizePanelForm');
    const customPanelQuery = screen.queryByTestId('panelCustomQueryRow');
    expect(customizePanelForm).not.toContainElement(customPanelQuery);
    const customPanelFilters = screen.queryByTestId('panelCustomFiltersRow');
    expect(customizePanelForm).not.toContainElement(customPanelFilters);
  });

  describe('filterable embeddable', () => {
    test('renders custom filters, if provided', async () => {
      const mockEmbeddable: FilterableEmbeddable = (await createEmbeddable({
        viewMode: ViewMode.EDIT,
      })) as unknown as FilterableEmbeddable;

      mockEmbeddable.getFilters = jest.fn().mockResolvedValue([
        {
          meta: {},
          query: {},
          $state: {},
        },
      ] as Filter[]);
      mockEmbeddable.getQuery = jest.fn().mockResolvedValue({});
      render(
        <IntlProvider locale="en">
          <CustomizePanelEditor
            {...DEFAULT_PROPS}
            embeddable={mockEmbeddable as unknown as IEmbeddable}
            timeRangeCompatible={false}
          />
        </IntlProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('euiSkeletonLoadingAriaWrapper')).toBeInTheDocument();
      });
      const customPanelQuery = await screen.findByTestId('panelCustomFiltersRow');
      expect(customPanelQuery).toBeInTheDocument();
    });

    test('renders a custom query, if provided', async () => {
      const mockEmbeddable: FilterableEmbeddable = (await createEmbeddable({
        viewMode: ViewMode.EDIT,
      })) as unknown as FilterableEmbeddable;
      mockEmbeddable.getFilters = jest.fn().mockResolvedValue([]);
      mockEmbeddable.getQuery = jest.fn().mockResolvedValue({ query: 'field : value' });
      render(
        <IntlProvider locale="en">
          <CustomizePanelEditor
            {...DEFAULT_PROPS}
            embeddable={mockEmbeddable as unknown as IEmbeddable}
            timeRangeCompatible={false}
          />
        </IntlProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('euiSkeletonLoadingAriaWrapper')).toBeInTheDocument();
      });
      const customPanelQuery = await screen.findByTestId('customPanelQuery');
      expect(customPanelQuery).toHaveTextContent('field : value');
    });
  });
});
