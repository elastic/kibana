/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './table_visualization.scss';
import React, { useEffect } from 'react';
import classNames from 'classnames';

import { CoreStart } from 'kibana/public';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import type { PersistedState } from 'src/plugins/visualizations/public';
import { KibanaContextProvider } from '../../../kibana_react/public';
import { TableVisConfig } from '../types';
import { TableContext } from '../table_vis_response_handler';
import { TableVisBasic } from './table_vis_basic';
import { TableVisSplit } from './table_vis_split';
import { useUiState } from '../utils';

interface TableVisualizationComponentProps {
  core: CoreStart;
  handlers: IInterpreterRenderHandlers;
  visData: TableContext;
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
            <div className="tbvChart__split">
              <TableVisBasic
                fireEvent={handlers.event}
                table={table}
                visConfig={visConfig}
                uiStateProps={uiStateProps}
              />
            </div>
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
