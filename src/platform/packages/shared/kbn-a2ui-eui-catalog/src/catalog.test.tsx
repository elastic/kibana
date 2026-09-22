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
