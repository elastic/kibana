/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import 'gridstack/dist/h5/gridstack-dd-native';
import { EuiButton } from '@elastic/eui';

interface Props {
  test: number;
}

interface State {
  count: number;
  info: string;
  items: GridStackNode[];
}

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
      float: false,
      cellHeight: '70px',
      minRow: 1,
      column: 12,
    });

    this.grid.on('dragstop', (event, element) => {
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
    const node = {
      x: Math.round(12 * Math.random()),
      y: 1,
      w: Math.round(1 + 3 * Math.random()),
      h: Math.round(1 + 3 * Math.random()),
      id,
      content: id,
    };

    this.setState((prevState) => ({
      count: prevState.count + 1,
      items: [...prevState.items, node],
    }));
    this.grid?.addWidget(node);
  };

  // addNewGrid = () => {
  //   const id = String(this.state.count);
  //   this.grid?.addWidget({
  //     x: 0,
  //     y: 0,
  //     w: 3,
  //     h: 3,
  //     content: 'nested add',
  //     subGrid: { dragOut: true, class: 'nested1', children: [] },
  //   });
  // };

  render() {
    return (
      <div>
        <EuiButton onClick={this.addNewWidget}>Add Panel</EuiButton>
        {/* <EuiButton onClick={this.addNewGrid}>Add Grid</EuiButton> */}

        <div>{JSON.stringify(this.state)}</div>
        <section className="grid-stack">
          <></>
        </section>
      </div>
    );
  }
}
