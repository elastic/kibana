/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { A2uiSurface, MessageProcessor } from '@kbn/a2ui-renderer';
import type { A2uiMessage, ResolvedActionEvent } from '@kbn/a2ui-renderer';
import { euiCatalog, euiCatalogSchema } from './catalog';

function renderApp(
  components: object[],
  dataModel: object = {},
  onAction?: (event: ResolvedActionEvent) => void
) {
  const processor = new MessageProcessor();
  processor.applyAll([
    { version: 'v1.0', createSurface: { surfaceId: 's1', components, dataModel } },
  ] as A2uiMessage[]);
  return render(
    <EuiProvider colorMode="light">
      <A2uiSurface surface={processor.getSurface('s1')!} catalog={euiCatalog} onAction={onAction} />
    </EuiProvider>
  );
}

describe('euiCatalog', () => {
  it('implements every component the catalog schema declares', () => {
    expect(Object.keys(euiCatalog.components).sort()).toEqual(
      Object.keys(euiCatalogSchema.components).sort()
    );
  });

  it('implements every function the catalog schema declares', () => {
    expect(Object.keys(euiCatalog.functions ?? {}).sort()).toEqual(
      Object.keys(euiCatalogSchema.functions).sort()
    );
  });

  it('declares its own catalogId consistently', () => {
    expect(euiCatalog.id).toBe(euiCatalogSchema.catalogId);
  });

  it('renders a card containing a heading and body text', () => {
    renderApp([
      { id: 'root', component: 'Card', title: 'Status', child: 'body' },
      { id: 'body', component: 'Text', text: 'All systems **nominal**', variant: 'body' },
    ]);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('nominal')).toBeInTheDocument();
  });

  it('round-trips user input through the data model into another component', () => {
    renderApp(
      [
        { id: 'root', component: 'Column', children: ['field', 'echo'] },
        { id: 'field', component: 'TextField', label: 'Service', value: { path: '/form/service' } },
        { id: 'echo', component: 'Text', text: { path: '/form/service' } },
      ],
      { form: { service: '' } }
    );

    fireEvent.change(screen.getByLabelText('Service'), { target: { value: 'checkout' } });

    expect(screen.getByLabelText('Service')).toHaveValue('checkout');
    expect(screen.getByText('checkout')).toBeInTheDocument();
  });

  it('disables an input whose value is a literal, since it has nowhere to write', () => {
    renderApp([{ id: 'root', component: 'TextField', label: 'Fixed', value: 'constant' }]);
    expect(screen.getByLabelText('Fixed')).toBeDisabled();
  });

  it('dispatches a button action carrying bound form state', () => {
    const onAction = jest.fn();
    renderApp(
      [
        { id: 'root', component: 'Column', children: ['go'] },
        {
          id: 'go',
          component: 'Button',
          label: 'Restart',
          variant: 'primary',
          action: {
            event: {
              name: 'kbn.runWorkflow',
              context: { workflowId: 'restart-svc', service: { path: '/form/service' } },
            },
          },
        },
      ],
      { form: { service: 'checkout' } },
      onAction
    );

    fireEvent.click(screen.getByText('Restart'));

    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'kbn.runWorkflow',
        context: { workflowId: 'restart-svc', service: 'checkout' },
      })
    );
  });

  it('renders a table from a bound array', () => {
    renderApp(
      [
        {
          id: 'root',
          component: 'Table',
          caption: 'Results by service',
          columns: [
            { field: 'name', name: 'Name' },
            { field: 'count', name: 'Count' },
          ],
          rows: { path: '/results' },
        },
      ],
      {
        results: [
          { name: 'alpha', count: 3 },
          { name: 'beta', count: 7 },
        ],
      }
    );

    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('repeats a template over a bound list using relative paths', () => {
    renderApp(
      [
        { id: 'root', component: 'Column', children: { componentId: 'item', path: '/services' } },
        { id: 'item', component: 'Badge', label: { path: 'name' } },
      ],
      { services: [{ name: 'api' }, { name: 'web' }] }
    );

    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
  });

  it('applies catalog functions to bound values', () => {
    renderApp(
      [
        {
          id: 'root',
          component: 'Text',
          text: { call: 'formatNumber', args: { value: { path: '/total' }, decimals: 2 } },
        },
      ],
      { total: 1234.5 }
    );
    expect(screen.getByText('1,234.50')).toBeInTheDocument();
  });

  it('toggles a checkbox and writes the boolean back', () => {
    renderApp([{ id: 'root', component: 'CheckBox', label: 'Confirm', value: { path: '/ack' } }], {
      ack: false,
    });

    const box = screen.getByLabelText('Confirm');
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(box).toBeChecked();
  });

  it('shows each tab title and the first tab body', () => {
    renderApp([
      {
        id: 'root',
        component: 'Tabs',
        tabs: [
          { title: 'Overview', child: 'a' },
          { title: 'Details', child: 'b' },
        ],
      },
      { id: 'a', component: 'Text', text: 'overview body' },
      { id: 'b', component: 'Text', text: 'details body' },
    ]);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('overview body')).toBeInTheDocument();
  });
});

describe('row actions and dialogs', () => {
  it('dispatches a row action with the clicked row merged into the context', () => {
    const onAction = jest.fn();
    renderApp(
      [
        {
          id: 'root',
          component: 'Table',
          caption: 'Errors',
          rows: { path: '/rows' },
          columns: [{ field: 'page', name: 'Page' }],
          rowActions: [
            {
              label: 'Inspect',
              action: { event: { name: 'kbn.setData', context: { path: '/selected' } } },
            },
          ],
        },
      ],
      { rows: [{ page: '/a', status: '404' }] },
      onAction
    );

    fireEvent.click(screen.getByLabelText('Inspect'));

    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'kbn.setData',
        context: { path: '/selected', row: { page: '/a', status: '404' } },
      })
    );
  });

  it('shows a Modal only while its bound value is truthy', () => {
    const components = [
      {
        id: 'root',
        component: 'Modal',
        title: 'Detail',
        isOpen: {
          call: 'not',
          args: { value: { call: 'isEmpty', args: { value: { path: '/selected' } } } },
        },
        child: 'body',
      },
      { id: 'body', component: 'Text', text: 'the detail' },
    ];

    const { unmount } = renderApp(components, { selected: null });
    expect(screen.queryByText('the detail')).not.toBeInTheDocument();
    unmount();

    renderApp(components, { selected: { page: '/a' } });
    expect(screen.getByText('the detail')).toBeInTheDocument();
  });

  describe('icon buttons', () => {
    it('names an icon-only button from its label, so it is never unlabelled', () => {
      renderApp([
        {
          id: 'root',
          component: 'Button',
          variant: 'icon',
          iconType: 'gear',
          label: 'Panel settings',
          action: { event: { name: 'kbn.navigate', context: { appId: 'home' } } },
        },
      ]);

      const button = screen.getByRole('button', { name: 'Panel settings' });
      expect(button).toBeInTheDocument();
      // Icon-only: the label is the accessible name, not visible text.
      expect(button).toHaveTextContent('');
    });

    it('still dispatches its action', () => {
      const onAction = jest.fn();
      renderApp(
        [
          {
            id: 'root',
            component: 'Button',
            variant: 'icon',
            iconType: 'plusInCircle',
            label: 'Add panel',
            action: { event: { name: 'kbn.setData', context: { path: '/added', value: true } } },
          },
        ],
        {},
        onAction
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add panel' }));
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'kbn.setData', context: { path: '/added', value: true } })
      );
    });
  });

  describe('toolbar-shaped inputs', () => {
    it('drops the form row when a search field hides its label', () => {
      renderApp(
        [
          {
            id: 'root',
            component: 'TextField',
            variant: 'search',
            hideLabel: true,
            label: 'Search resources',
            placeholder: 'health:unhealthy',
            value: { path: '/filters/q' },
          },
        ],
        { filters: { q: '' } }
      );

      const input = screen.getByRole('searchbox', { name: 'Search resources' });
      expect(input).toBeEnabled();
      // The label is the accessible name only — no visible form label.
      expect(screen.queryByText('Search resources')).not.toBeInTheDocument();
    });

    it('writes what the user types into the bound path', () => {
      renderApp(
        [
          {
            id: 'root',
            component: 'Column',
            children: ['search', 'echo'],
          },
          {
            id: 'search',
            component: 'TextField',
            variant: 'search',
            hideLabel: true,
            label: 'Search',
            value: { path: '/filters/q' },
          },
          { id: 'echo', component: 'Text', text: { path: '/filters/q' } },
        ],
        { filters: { q: '' } }
      );

      fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
        target: { value: 'checkout' },
      });
      expect(screen.getByText('checkout')).toBeInTheDocument();
    });

    it('prepends the label inside an inline ChoicePicker instead of above it', () => {
      renderApp(
        [
          {
            id: 'root',
            component: 'ChoicePicker',
            inline: true,
            label: 'Group by',
            value: { path: '/filters/groupBy' },
            options: [
              { label: 'Cluster', value: 'cluster' },
              { label: 'Namespace', value: 'namespace' },
            ],
          },
        ],
        { filters: { groupBy: 'cluster' } }
      );

      const select = screen.getByRole('combobox', { name: 'Group by' });
      expect(select).toHaveValue('cluster');
      // Prepended, so it renders once as part of the control.
      expect(screen.getAllByText('Group by')).toHaveLength(1);
    });
  });

  describe('overlays', () => {
    const flyout = (selected: unknown) => [
      {
        id: 'root',
        component: 'Flyout',
        title: 'Pod detail',
        isOpen: {
          call: 'not',
          args: { value: { call: 'isEmpty', args: { value: { path: '/selected' } } } },
        },
        child: 'body',
        onClose: { event: { name: 'kbn.setData', context: { path: '/selected', value: null } } },
      },
      { id: 'body', component: 'Text', text: { path: '/selected/pod' } },
    ];

    it('stays closed while its bound value is empty', () => {
      renderApp(flyout(null), { selected: null });
      expect(screen.queryByText('Pod detail')).not.toBeInTheDocument();
    });

    it('opens with the bound row once something selects it', () => {
      renderApp(flyout({ pod: 'checkout-api-7c9f8' }), {
        selected: { pod: 'checkout-api-7c9f8' },
      });
      // Asserted on content rather than the accessible name: Kibana's jest setup
      // stubs `useGeneratedHtmlId` to a constant, so `aria-labelledby` does not
      // resolve here. That is an artifact of the environment, not the component.
      expect(screen.getByRole('heading', { name: 'Pod detail' })).toBeInTheDocument();
      expect(screen.getByText('checkout-api-7c9f8')).toBeInTheDocument();
      expect(screen.getByTestId('euiFlyoutCloseButton')).toBeInTheDocument();
    });

    it('dispatches onClose rather than closing itself', () => {
      // Visibility is the data model's business, so the component must not hold
      // its own open state — otherwise the binding and the UI can disagree.
      const onAction = jest.fn();
      renderApp(flyout({ pod: 'p' }), { selected: { pod: 'p' } }, onAction);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(onAction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'kbn.setData',
          context: { path: '/selected', value: null },
        })
      );
    });

    const popover = (open: boolean) => [
      {
        id: 'root',
        component: 'Popover',
        anchor: 'trigger',
        isOpen: { path: '/ui/menuOpen' },
        title: 'Add custom metric',
        child: 'body',
        onBack: { event: { name: 'kbn.setData', context: { path: '/ui/menuOpen', value: null } } },
        onClose: { event: { name: 'kbn.setData', context: { path: '/ui/menuOpen', value: null } } },
      },
      {
        id: 'trigger',
        component: 'Button',
        variant: 'icon',
        iconType: 'boxesVertical',
        label: 'More actions',
        action: { event: { name: 'kbn.setData', context: { path: '/ui/menuOpen', value: true } } },
      },
      { id: 'body', component: 'Text', text: 'metric picker' },
    ];

    it('renders its anchor but not its content while closed', () => {
      renderApp(popover(false), { ui: { menuOpen: false } });
      expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
      expect(screen.queryByText('metric picker')).not.toBeInTheDocument();
    });

    it('shows the content and a back chevron when bound open', () => {
      renderApp(popover(true), { ui: { menuOpen: true } });
      expect(screen.getByText('metric picker')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add custom metric' })).toBeInTheDocument();
    });
  });

  describe('layout escape hatches', () => {
    it('lets one child take the leftover width via grow', () => {
      const { container } = renderApp([
        { id: 'root', component: 'Row', grow: [0, 1, 0], children: ['a', 'b', 'c'] },
        { id: 'a', component: 'Badge', label: 'left' },
        { id: 'b', component: 'Badge', label: 'middle' },
        { id: 'c', component: 'Badge', label: 'right' },
      ]);

      // EUI only sizes direct EuiFlexItem children, so `grow` has to wrap them.
      const items = container.querySelectorAll('.euiFlexItem');
      expect(items).toHaveLength(3);
      expect(screen.getByText('middle')).toBeInTheDocument();
    });

    it('wraps nothing when grow is absent, leaving existing layouts untouched', () => {
      const { container } = renderApp([
        { id: 'root', component: 'Row', children: ['a', 'b'] },
        { id: 'a', component: 'Badge', label: 'one' },
        { id: 'b', component: 'Badge', label: 'two' },
      ]);

      expect(container.querySelectorAll('.euiFlexItem')).toHaveLength(0);
    });

    it('renders a Card header child in place of its title', () => {
      renderApp([
        { id: 'root', component: 'Card', header: 'head', title: 'ignored', child: 'body' },
        { id: 'head', component: 'Row', justify: 'spaceBetween', children: ['name', 'count'] },
        { id: 'name', component: 'Text', text: 'k8s-eu-prod', variant: 'heading3' },
        { id: 'count', component: 'Badge', label: '540' },
        { id: 'body', component: 'Text', text: 'the grid' },
      ]);

      expect(screen.getByText('k8s-eu-prod')).toBeInTheDocument();
      expect(screen.getByText('540')).toBeInTheDocument();
      expect(screen.getByText('the grid')).toBeInTheDocument();
      // A header replaces the title rather than stacking with it.
      expect(screen.queryByText('ignored')).not.toBeInTheDocument();
    });
  });
});
