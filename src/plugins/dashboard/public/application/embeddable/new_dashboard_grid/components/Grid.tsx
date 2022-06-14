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
import { tutorialSchema } from '@kbn/home-plugin/server/services/tutorials/lib/tutorial_schema';

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
      acceptWidgets: true,
      minRow: 10,
      column: 12,
    });

    this.grid.on('dragstop', (event, element) => {
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

  addNewGrid = () => {
    const id = String(this.state.count);
    const subGrid = this.grid?.addWidget({
      autoPosition: true,
      w: 12,
      h: 4,
      noResize: true,
      content: '<h1>title</h1>',
      subGrid: {
        minRow: 4,
        auto: true,
        acceptWidgets: true,
        class: 'nested1',
        dragInOptions: {
          helper: (event) => {
            console.log(event);
            return event.target as HTMLElement;
          },
        },
        column: 12,
        children: [],
      },
    });

    // subGrid.on('drag', (event, element) => {
    //   console.log('dragging in subgrid');
    // });
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
