/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { debounce } from 'lodash';
import {
  GridItemHTMLElement,
  GridStack,
  GridStackWidget,
  GridStackNode,
  GridStackEventHandlerCallback,
} from 'gridstack';
import 'gridstack/dist/h5/gridstack-dd-native';
import { EuiButton } from '@elastic/eui';

const CELL_HEIGHT = '70px';
const GRID_CLASS = 'dshGrid';
const HANDLE_CLASS = 'dshPanel__wrapper';
const PANEL_CLASS = 'dshPanel';

interface Props {
  test: number;
}

interface State {
  count: number;
  info: string;
  items: GridStackNode[];
}

const NUM_COLUMNS = 48;

const SHARED_GRID_PARMS = {
  margin: 5, // 5 pixels around each panel - so 10 pixels **between** two panels
  column: NUM_COLUMNS,
  cellHeight: CELL_HEIGHT,
  float: false,
  acceptWidgets: true,
  handleClass: HANDLE_CLASS,
  itemClass: PANEL_CLASS,
};

export class Grid extends React.Component<Props, State> {
  private grid: GridStack | undefined;

  constructor(props: Props) {
    super(props);

    this.state = {
      count: 0,
      info: '',
      items: [],
    };
    this.grid = undefined;
  }

  componentDidMount() {
    // Provides access to the GridStack instance across the React component.
    this.grid = GridStack.init({
      ...SHARED_GRID_PARMS,
      minRow: 10,
      class: GRID_CLASS,
    });

    this.grid.on('drag', (event, element) => {
      console.log('grid drag stop');
      const node = (element as GridItemHTMLElement)?.gridstackNode;
      if (!node) return;
      const newItems = [...this.state.items];
      const { x, y, w, h, content, id } = node;
      newItems[Number(node.id)] = { x, y, w, h, content, id };
      this.setState((prevState) => ({
        info: `you just dragged node #${node.id} to ${node.x},${node.y} – good job!`,
        items: newItems,
      }));
    });
  }

  addNewWidget = () => {
    const id = String(this.state.count);
    const node: GridStackNode = {
      x: Math.round(NUM_COLUMNS * Math.random()),
      y: 1,
      w: Math.round(1 + 3 * Math.random()),
      h: Math.round(1 + 3 * Math.random()),
      id,
      content: id,
      resizeHandles: 'se',
    };

    this.setState((prevState) => ({
      count: prevState.count + 1,
      items: [...prevState.items, node],
    }));

    this.grid?.addWidget(node);
  };

  addNewGrid = () => {
    const id = `panel-group-${this.state.count}`;
    const newGroup = this.grid?.addWidget({
      id,
      autoPosition: true,
      w: NUM_COLUMNS,
      h: 4,
      // noResize: true,
      noResize: true,
      content: `<h1 style="height:50px;width:100%">title</h1>`,
      subGrid: {
        ...SHARED_GRID_PARMS,
        minRow: 4,
        acceptWidgets: true,
        class: 'nested1',
        children: [],
      },
    });

    const subGrid = newGroup?.gridstackNode?.subGrid as GridStack;

    const updateHeight = (element: GridStackWidget) => {
      if (newGroup?.gridstackNode) {
        this.grid?.update(newGroup, { h: subGrid.getRow() + 1 });
      }
    };

    const resizeWrapper: GridStackEventHandlerCallback = (event, el) => {
      if (el) {
        if (newGroup?.gridstackNode?.subGrid) {
          if (Array.isArray(el)) {
            // TODO: grab max height
          } else {
            updateHeight(el);
          }
        }
      }
    };

    subGrid?.on('drag resize', debounce(resizeWrapper, 200));
  };

  render() {
    return (
      <div>
        <EuiButton onClick={this.addNewWidget}>Add Panel</EuiButton>{' '}
        <EuiButton onClick={this.addNewGrid}>Add Grid</EuiButton>
        <div>{JSON.stringify(this.state)}</div>
        <section className="grid-stack">
          <></>
        </section>
      </div>
    );
  }
}
