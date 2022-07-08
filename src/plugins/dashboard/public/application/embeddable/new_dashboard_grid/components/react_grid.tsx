/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiAccordion, htmlIdGenerator } from '@elastic/eui';
import ReactDOM from 'react-dom';
import { GridStack, GridItemHTMLElement, GridStackOptions } from 'gridstack';
import 'gridstack/dist/h5/gridstack-dd-native';
import React, {
  FC,
  useCallback,
  useState,
  useMemo,
  useRef,
  RefObject,
  createRef,
  useEffect,
} from 'react';
import { GridStackNode, GridStackWidget } from '../lib/gridstack_helpers';
import { GridItem } from './react_grid_item';
import { GridGroup } from './react_grid_group';

type ColumnOptions = 12 | 24 | 48;

const GRID_CLASS = 'dshGrid';
const HANDLE_CLASS = 'dshPanel__wrapper';
const PANEL_CLASS = 'dshPanel';
const GROUP_CLASS = 'dshPanelGroup';
const NUM_COLUMNS = 48;
const DEFAULT_CELL_HEIGHT = 32;
const DEFAULT_GUTTERSIZE = 4;

const GRID_CONFIG = {
  12: {
    class: 'dshLayout__grid--small',
    cellHeight: DEFAULT_CELL_HEIGHT * 4,
    gridHeightOffset: 1,
  },
  24: {
    class: 'dshLayout__grid--medium',
    cellHeight: DEFAULT_CELL_HEIGHT * 2,
    gridHeightOffset: 2,
  },
  48: { class: 'dshLayout__grid--large', cellHeight: DEFAULT_CELL_HEIGHT, gridHeightOffset: 3 },
};

interface Props {
  gridData?: GridStackWidget[];
  columns?: ColumnOptions;
  guttersize?: number; // in pixels
}

export const Grid: FC<Props> = ({
  gridData = [],
  columns = NUM_COLUMNS,
  guttersize = DEFAULT_GUTTERSIZE, // TODO: do we want to allow 0 or should we set a min value?
}) => {
  const gridRef = useRef<GridStack>();
  const panelRefs = useRef<{ [key: string]: RefObject<HTMLDivElement> }>({});
  const [panels, setPanels] = useState<GridStackWidget[]>(gridData);
  const [info, setInfo] = useState<string>('');

  if (Object.keys(panelRefs.current).length !== panels.length) {
    panels.forEach(({ id }) => {
      panelRefs.current[id] = panelRefs.current[id] || createRef();
    });
  }

  const sharedGridParams = useMemo(
    () => ({
      acceptWidgets: true,
      // The CSS transitions look nice, but I think they impact rendering performance. We might want to turn them off
      // animate: false,
      float: false,
      // TODO: do we like auto cell height? gridstack will just calculate whatever height to achieve a square with the height matching the width of the column
      // It'll also resize as you adjust your viewport, so we don't run into issues with small screens and a static cell height
      // We can decide when we've got gridstack in dashboard and see how responsive individual embeddables/visualizations are
      // cellHeight: 'auto',
      cellHeight: `${GRID_CONFIG[columns].cellHeight}px`,
      column: columns,
      handleClass: HANDLE_CLASS,
      margin: guttersize,
      minRow: columns / 4,
    }),
    [columns, guttersize]
  );

  const addPanelToGroup = useCallback(
    (items: GridStackWidget[], groupId: string) => {
      console.log({ panels, items });

      // extract destination group
      const panelGroup = panels.find(({ id }) => id === groupId);

      if (panelGroup?.subGrid) {
        // grab IDs for panels that are moving into a group
        const movedPanelIds = items.map(({ id }) => {
          console.log({ id });
          gridRef?.current?.removeWidget(`#${id}`, false);
          return id;
        });

        console.log({ movedPanelIds });
        // Remove moving panels and group panel
        const newPanels = [
          ...panels.filter(({ id }) => !movedPanelIds.includes(id) && id !== groupId),
        ];
        const newPanelGroup = { ...panelGroup };

        const subGrid = newPanelGroup.subGrid as GridStackOptions;
        const children = subGrid.children
          ? subGrid.children.filter(({ id }) => !movedPanelIds.includes(`${id}`))
          : [];

        subGrid.children = [...children, ...items];
        setPanels([...newPanels, newPanelGroup]);
      } else {
        // TODO: error handling when destination group is missing
        console.log(`no panel group with id ${groupId}`);
      }
    },
    [panels]
  );

  useEffect(() => {
    gridRef.current =
      gridRef.current ||
      GridStack.init({
        ...sharedGridParams,
        class: GRID_CLASS,
        draggable: { scroll: true },
      });

    const grid = gridRef.current;

    // This batches all the updates and only re-renders once you call grid.commit()
    grid.batchUpdate();
    grid.removeAll(false);

    panels.map((panel) => {
      if (document.getElementById(panel.id)) {
        const panelElement = grid.addWidget({ ...panel, content: undefined });
      }
      ReactDOM.render(
        panel.subGrid ? <GridGroup group={panel} /> : <GridItem panel={panel} />,
        panelElement
      );
    });

    grid.commit();
  }, [panels, sharedGridParams]);

  const addNewPanel = useCallback(() => {
    const grid = gridRef.current;

    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = htmlIdGenerator('panel')();

    const widgetConfig: GridStackNode = {
      x: 0,
      y: grid.getRow(),
      w: Math.ceil((Math.random() * columns) / 2 + 1),
      h: Math.ceil((Math.random() * columns) / 3 + 1),
      id,
      content: id,
      resizeHandles: 'se',
    };

    setPanels([...panels, widgetConfig]);
  }, [panels, columns]);

  const addNewPanelGroup = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) {
      // TODO: error handling bc grid isn't instantiated
      return;
    }

    const id = htmlIdGenerator('panel-group')();
    const groupConfig = {
      id,
      x: 0,
      y: 0,
      w: columns,
      h: columns / 4 + 1,
      content: `Panel title`,
      noResize: true,
      subGrid: {
        ...sharedGridParams,
        children: [],
        class: 'dshPanelGroup__grid',
        acceptWidgets: `.${PANEL_CLASS}`,
      },
    };

    setPanels([...panels, groupConfig]);
  }, [panels, columns, sharedGridParams]);

  console.log({ grid: gridRef.current, panels });

  return (
    <div>
      <EuiButton onClick={addNewPanel}>Add Panel</EuiButton>&nbsp;
      <EuiButton onClick={addNewPanelGroup}>Add Grid</EuiButton>&nbsp;
      <div>{info}</div>
      <div>Count:{panels.length}</div>
      <EuiAccordion id={`accordion`} buttonContent="Panel data">
        <div>{JSON.stringify(panels)}</div>
      </EuiAccordion>
      <div className={`grid-stack dshGrid dshLayout--editing ${GRID_CONFIG[columns].class}`}>
        {panels.map((panel) => {
          return (
            <div
              ref={panelRefs.current[panel.id]}
              key={panel.id}
              className={`grid-stack-item react-grid-item ${
                panel.subGrid ? GROUP_CLASS : PANEL_CLASS
              }`}
            >
              {panel.subGrid ? (
                <GridGroup
                  group={panel}
                  addPanelToGroup={addPanelToGroup}
                  parentGridRef={gridRef}
                />
              ) : (
                <GridItem panel={panel} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
