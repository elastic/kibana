/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './table_visualization.scss';
import React, { useEffect } from 'react';
import classNames from 'classnames';

import { CoreStart } from '@kbn/core/public';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { TableVisConfig, TableVisData } from '../types';
import { TableVisBasic } from './table_vis_basic';
import { TableVisSplit } from './table_vis_split';
import { useUiState } from '../utils';

interface TableVisualizationComponentProps {
  core: CoreStart;
  handlers: IInterpreterRenderHandlers;
  visData: TableVisData;
  visConfig: TableVisConfig;
}

const TableVisualizationComponent = ({
  core,
  handlers,
  visData: { direction, table, tables },
  visConfig,
}: TableVisualizationComponentProps) => {
  useEffect(() => {
    handlers.done();
  }, [handlers]);

  const uiStateProps = useUiState(handlers.uiState as PersistedState);

  const className = classNames('tbvChart', {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    tbvChart__splitColumns: direction === 'column',
  });

  return (
    <core.i18n.Context>
      <KibanaContextProvider services={core}>
        <div className={className} data-test-subj="tbvChart">
          {table ? (
            <TableVisBasic
              fireEvent={handlers.event}
              table={table}
              visConfig={visConfig}
              uiStateProps={uiStateProps}
            />
          ) : (
            <TableVisSplit
              fireEvent={handlers.event}
              tables={tables}
              visConfig={visConfig}
              uiStateProps={uiStateProps}
            />
          )}
        </div>
      </KibanaContextProvider>
    </core.i18n.Context>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TableVisualizationComponent as default };
