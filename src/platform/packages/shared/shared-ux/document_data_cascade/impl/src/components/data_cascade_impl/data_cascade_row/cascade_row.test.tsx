/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { render, screen } from '@testing-library/react';
import { createTable, getCoreRowModel } from '@tanstack/react-table';
import { CascadeRowPrimitive } from './cascade_row';
import type { CascadeRowPrimitiveProps } from '../types';
import { DataCascadeProvider } from '../../../store_provider';
import type { MockGroupData } from '../../../__fixtures__/types';
import { useStickyHeaderExtensionPoint } from './components/cascade_row_header_extension_point';

jest.mock('./components/cascade_row_header', () => ({
  CascadeRowHeaderPrimitive: () => <div>Group heading</div>,
}));

const ExtensionContent = () => {
  const { extensionPointElement, stickyEnabled } = useStickyHeaderExtensionPoint();
  return createPortal(
    <button>{stickyEnabled ? 'Sticky toolbar' : 'Static toolbar'}</button>,
    extensionPointElement
  );
};

type RowProps = CascadeRowPrimitiveProps<MockGroupData, MockGroupData>;

const createRowProps = (): RowProps => {
  const table = createTable<MockGroupData>({
    data: [{ id: 'friday', count: 2, group: 'Friday' }],
    columns: [{ accessorKey: 'group', cell: ExtensionContent }],
    getCoreRowModel: getCoreRowModel(),
    state: { expanded: true, columnPinning: { left: [], right: [] } },
    onStateChange: jest.fn(),
    renderFallbackValue: null,
  });
  const rowInstance = table.getRowModel().rows[0];
  return {
    rowInstance,
    size: 's',
    isMobile: false,
    isActiveSticky: false,
    enableStickyGroupHeader: true,
    innerRef: null,
    activeStickyRenderSlotRef: { current: document.createElement('div') },
    virtualRowStyle: { transform: 'translateY(400px)', zIndex: 10 },
    virtualRow: { index: 0, key: rowInstance.id, start: 400, end: 1400, size: 1000, lane: 0 },
    getVirtualizer: jest.fn(),
    onCascadeGroupNodeExpanded: jest.fn(),
    rowHeaderTitleSlot: () => <div>Friday</div>,
  };
};

const renderRow = (props: RowProps, groups = ['group']) => (
  <DataCascadeProvider data={[]} cascadeGroups={groups} initialGroupColumn={groups}>
    <CascadeRowPrimitive {...props} />
  </DataCascadeProvider>
);

describe('CascadeRowPrimitive sticky headers', () => {
  it('keeps the inline header and extension in flow across sticky visibility changes', () => {
    const props = createRowProps();
    const view = render(renderRow(props));
    const host = screen.getByTestId('dataCascadeInlineStickyHeader');
    const toolbar = screen.getByRole('button', { name: 'Sticky toolbar' });
    const row = screen.getByRole('row');

    expect(host).toContainElement(toolbar);
    expect(row).toHaveStyle({ top: '400px' });
    expect(row.style.transform).toBe('');
    expect(getComputedStyle(host).position).toBe('sticky');
    const paddingTop = getComputedStyle(host).paddingTop;

    view.rerender(renderRow({ ...props, isActiveSticky: true }));

    expect(screen.getByTestId('dataCascadeInlineStickyHeader')).toBe(host);
    expect(host).toContainElement(toolbar);

    expect(getComputedStyle(host).paddingTop).toBe(paddingTop);
    expect(props.activeStickyRenderSlotRef.current).toBeEmptyDOMElement();

    view.rerender(renderRow(props));

    expect(screen.getByTestId('dataCascadeInlineStickyHeader')).toBe(host);
    expect(host).toContainElement(toolbar);
  });

  it('keeps the host in normal flow when sticky positioning is disabled', () => {
    const props = { ...createRowProps(), enableStickyGroupHeader: false };
    render(renderRow(props));
    const host = screen.getByTestId('dataCascadeInlineStickyHeader');
    expect(host).toContainElement(screen.getByRole('button', { name: 'Static toolbar' }));
    expect(getComputedStyle(host).position).toBe('relative');
  });

  it('portals the active parent heading while measuring only its own row', () => {
    const innerRef = jest.fn();
    const props = { ...createRowProps(), isActiveSticky: true, innerRef };
    render(renderRow(props, ['outer', 'group']));
    const row = screen.getByRole('row');
    expect(innerRef).toHaveBeenCalledWith(row);
    expect(row).toHaveStyle({ transform: 'translateY(400px)', zIndex: '10' });
    expect(row.style.height).toBe('');
    expect(props.activeStickyRenderSlotRef.current).toHaveTextContent('Group heading');
    expect(screen.queryByTestId('dataCascadeInlineStickyHeader')).not.toBeInTheDocument();
  });

  it('updates the parent positioning when its stacking order changes', () => {
    const props = createRowProps();
    const view = render(renderRow(props, ['outer', 'group']));
    view.rerender(
      renderRow({ ...props, virtualRowStyle: { ...props.virtualRowStyle, zIndex: 20 } }, [
        'outer',
        'group',
      ])
    );
    expect(screen.getByRole('row')).toHaveStyle({ zIndex: '20' });
  });

  it('does not portal an inactive or disabled parent', () => {
    const props = createRowProps();
    const view = render(renderRow(props, ['outer', 'group']));
    expect(props.activeStickyRenderSlotRef.current).toBeEmptyDOMElement();
    view.rerender(
      renderRow({ ...props, isActiveSticky: true, enableStickyGroupHeader: false }, [
        'outer',
        'group',
      ])
    );
    expect(props.activeStickyRenderSlotRef.current).toBeEmptyDOMElement();
  });

  it('keeps a nested leaf header inline rather than portalling it into the parent slot', () => {
    const props = createRowProps();
    props.rowInstance.depth = 2;
    render(renderRow({ ...props, isActiveSticky: true }, ['outer', 'middle', 'group']));
    expect(getComputedStyle(screen.getByTestId('dataCascadeInlineStickyHeader')).position).toBe(
      'sticky'
    );
    expect(screen.getByTestId('dataCascadeInlineStickyHeader')).toContainElement(
      screen.getByRole('button', { name: 'Sticky toolbar' })
    );
    expect(props.activeStickyRenderSlotRef.current).toBeEmptyDOMElement();
  });
});
