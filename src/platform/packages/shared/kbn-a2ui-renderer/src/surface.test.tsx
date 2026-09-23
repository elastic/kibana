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
import { MessageProcessor } from './message_processor';
import { A2uiSurface } from './surface';
import type { A2uiMessage, Catalog, ChildList, ResolvedActionEvent } from './types';

const catalog: Catalog = {
  id: 'test',
  components: {
    Text: {
      name: 'Text',
      render: ({ props, accessibility }) => (
        <p aria-label={accessibility?.label}>{String(props.text ?? '')}</p>
      ),
    },
    Column: {
      name: 'Column',
      render: ({ props, buildChild }) => <div>{buildChild(props.children as ChildList)}</div>,
    },
    TextField: {
      name: 'TextField',
      render: ({ props, getBindingPath, setValue }) => {
        const path = getBindingPath('text');
        return (
          <input
            aria-label={String(props.label ?? 'field')}
            value={String(props.text ?? '')}
            onChange={(e) => path && setValue(path, e.target.value)}
          />
        );
      },
    },
    Button: {
      name: 'Button',
      render: ({ props, rawProps, dispatchAction }) => (
        <button onClick={() => dispatchAction(rawProps.action as never)}>
          {String(props.label ?? '')}
        </button>
      ),
    },
  },
  functions: {
    shout: (args) => String(args.value ?? '').toUpperCase(),
  },
};

function renderMessages(messages: A2uiMessage[], onAction?: (e: ResolvedActionEvent) => void) {
  const processor = new MessageProcessor();
  processor.applyAll(messages);
  const surface = processor.getSurface('s1')!;
  return {
    surface,
    ...render(<A2uiSurface surface={surface} catalog={catalog} onAction={onAction} />),
  };
}

const createSurface = (components: object[], dataModel: object = {}): A2uiMessage =>
  ({ version: 'v1.0', createSurface: { surfaceId: 's1', components, dataModel } } as A2uiMessage);

describe('A2uiSurface', () => {
  it('renders the root component and resolves a literal prop', () => {
    renderMessages([createSurface([{ id: 'root', component: 'Text', text: 'hello' }])]);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('resolves a data binding through a JSON pointer', () => {
    renderMessages([
      createSurface([{ id: 'root', component: 'Text', text: { path: '/user/name' } }], {
        user: { name: 'ada' },
      }),
    ]);
    expect(screen.getByText('ada')).toBeInTheDocument();
  });

  it('resolves a catalog function call', () => {
    renderMessages([
      createSurface(
        [
          {
            id: 'root',
            component: 'Text',
            text: { call: 'shout', args: { value: { path: '/n' } } },
          },
        ],
        { n: 'quiet' }
      ),
    ]);
    expect(screen.getByText('QUIET')).toBeInTheDocument();
  });

  it('renders a static child list', () => {
    renderMessages([
      createSurface([
        { id: 'root', component: 'Column', children: ['a', 'b'] },
        { id: 'a', component: 'Text', text: 'first' },
        { id: 'b', component: 'Text', text: 'second' },
      ]),
    ]);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('repeats a template over a data model array, with relative paths and @index', () => {
    renderMessages([
      createSurface(
        [
          { id: 'root', component: 'Column', children: { componentId: 'row', path: '/items' } },
          {
            id: 'row',
            component: 'Text',
            text: { call: 'shout', args: { value: { path: 'label' } } },
          },
        ],
        { items: [{ label: 'one' }, { label: 'two' }] }
      ),
    ]);
    expect(screen.getByText('ONE')).toBeInTheDocument();
    expect(screen.getByText('TWO')).toBeInTheDocument();
  });

  it('writes user input back to the bound path and re-renders readers of it', () => {
    renderMessages([
      createSurface(
        [
          { id: 'root', component: 'Column', children: ['input', 'echo'] },
          { id: 'input', component: 'TextField', label: 'Name', text: { path: '/form/name' } },
          { id: 'echo', component: 'Text', text: { path: '/form/name' } },
        ],
        { form: { name: '' } }
      ),
    ]);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'grace' } });

    expect(screen.getByLabelText('Name')).toHaveValue('grace');
    expect(screen.getByText('grace')).toBeInTheDocument();
  });

  it('dispatches an action event with its context resolved against the data model', () => {
    const onAction = jest.fn();
    renderMessages(
      [
        createSurface(
          [
            {
              id: 'root',
              component: 'Button',
              label: 'Run',
              action: {
                event: {
                  name: 'kbn.runWorkflow',
                  context: { workflowId: 'wf-1', service: { path: '/form/service' } },
                },
              },
            },
          ],
          { form: { service: 'checkout' } }
        ),
      ],
      onAction
    );

    fireEvent.click(screen.getByText('Run'));

    expect(onAction).toHaveBeenCalledWith({
      surfaceId: 's1',
      name: 'kbn.runWorkflow',
      userMessage: undefined,
      context: { workflowId: 'wf-1', service: 'checkout' },
    });
  });

  it('applies accessibility attributes', () => {
    renderMessages([
      createSurface([
        { id: 'root', component: 'Text', text: 'x', accessibility: { label: 'Greeting' } },
      ]),
    ]);
    expect(screen.getByLabelText('Greeting')).toBeInTheDocument();
  });

  it('renders nothing for a child reference that has no definition yet', () => {
    const { container } = renderMessages([
      createSurface([{ id: 'root', component: 'Column', children: ['missing'] }]),
    ]);
    expect(container.querySelector('div')).toBeEmptyDOMElement();
  });

  it('falls back to renderUnknown for a component outside the catalog', () => {
    const processor = new MessageProcessor();
    processor.applyAll([createSurface([{ id: 'root', component: 'NotInCatalog' }])]);
    render(
      <A2uiSurface
        surface={processor.getSurface('s1')!}
        catalog={catalog}
        renderUnknown={(type) => <span>unsupported: {type}</span>}
      />
    );
    expect(screen.getByText(/unsupported: NotInCatalog/)).toBeInTheDocument();
  });

  it('applies updateComponents and updateDataModel after creation', () => {
    const processor = new MessageProcessor();
    processor.applyAll([
      createSurface([{ id: 'root', component: 'Text', text: { path: '/v' } }], { v: 'before' }),
      { updateDataModel: { surfaceId: 's1', path: '/v', value: 'after' } } as A2uiMessage,
    ]);
    render(<A2uiSurface surface={processor.getSurface('s1')!} catalog={catalog} />);
    expect(screen.getByText('after')).toBeInTheDocument();
  });
});

describe('nested bindings', () => {
  it('resolves bindings inside arrays of objects', () => {
    const catalogWithList: Catalog = {
      ...catalog,
      components: {
        ...catalog.components,
        List: {
          name: 'List',
          render: ({ props }) => (
            <ul>
              {(props.items as Array<{ label: string }>).map((item, i) => (
                <li key={i}>{String(item.label)}</li>
              ))}
            </ul>
          ),
        },
      },
    };

    const processor = new MessageProcessor();
    processor.applyAll([
      createSurface(
        [
          {
            id: 'root',
            component: 'List',
            items: [{ label: { path: '/a' } }, { label: { path: '/b' } }],
          },
        ],
        { a: 'first', b: 'second' }
      ),
    ]);

    render(<A2uiSurface surface={processor.getSurface('s1')!} catalog={catalogWithList} />);

    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('leaves a child list template intact rather than resolving it away', () => {
    renderMessages([
      createSurface(
        [
          { id: 'root', component: 'Column', children: { componentId: 'row', path: '/items' } },
          { id: 'row', component: 'Text', text: { path: 'name' } },
        ],
        { items: [{ name: 'alpha' }] }
      ),
    ]);
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });
});
