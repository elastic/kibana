/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { DiscoverGridCellPopover } from './discover_grid_cell_popover';

describe('Discover grid cell popover rendering', function () {
  const CellValue = ({ schema }: { schema: string }) => {
    return <div>{schema}</div>;
  };

  it('renders correctly', () => {
    const setMock = jest.fn();
    const component = mount(
      <DiscoverGridCellPopover
        cellActions={<button>{'test'}</button>}
        setCellPopoverProps={setMock}
      >
        <CellValue schema="string" />
      </DiscoverGridCellPopover>
    );
    expect(component.html()).toMatchInlineSnapshot(
      `"<div class=\\"euiFlexGroup css-4b375e\\"><div class=\\"euiFlexItem css-9sbomz-euiFlexItem-grow-1\\"><div>string</div></div><div class=\\"euiFlexItem css-kpsrin-euiFlexItem-growZero\\"><button>test</button></div></div>"`
    );
    expect(setMock).toHaveBeenCalledWith({
      panelClassName: 'dscDiscoverGrid__cellPopover',
    });
  });

  it('renders correctly for json view', () => {
    const setMock = jest.fn();
    const component = mount(
      <DiscoverGridCellPopover
        cellActions={<button>{'test'}</button>}
        setCellPopoverProps={setMock}
      >
        <CellValue schema="kibana-json" />
      </DiscoverGridCellPopover>
    );
    expect(component.html()).toMatchInlineSnapshot(
      `"<div class=\\"euiFlexGroup css-4b375e\\"><div class=\\"euiFlexItem css-9sbomz-euiFlexItem-grow-1\\"><div>kibana-json</div></div><div class=\\"euiFlexItem css-kpsrin-euiFlexItem-growZero\\"><button>test</button></div></div>"`
    );
    expect(setMock).toHaveBeenCalledWith({
      panelClassName: 'dscDiscoverGrid__cellPopover dscDiscoverGrid__cellPopover--withJson',
    });
  });
});
