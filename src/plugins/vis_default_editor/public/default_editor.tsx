/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './index.scss';
import 'brace/mode/json';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EventEmitter } from 'events';

import { Vis, VisualizeEmbeddableContract } from 'src/plugins/visualizations/public';
import { EditorRenderProps } from 'src/plugins/visualize/public';
import { KibanaContextProvider, PanelsContainer, Panel } from '../../kibana_react/public';
import { Storage } from '../../kibana_utils/public';

import { DefaultEditorSideBar } from './components/sidebar';
import { getInitialWidth } from './editor_size';

const localStorage = new Storage(window.localStorage);

function DefaultEditor({
  core,
  data,
  vis,
  uiState,
  timeRange,
  filters,
  query,
  embeddableHandler,
  eventEmitter,
  linked,
  savedSearch,
}: EditorRenderProps & {
  vis: Vis;
  eventEmitter: EventEmitter;
  embeddableHandler: VisualizeEmbeddableContract;
}) {
  const visRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onClickCollapse = useCallback(() => {
    setIsCollapsed((value) => !value);
  }, []);

  useEffect(() => {
    if (!visRef.current) {
      return;
    }

    embeddableHandler.render(visRef.current);
    setTimeout(() => {
      eventEmitter.emit('embeddableRendered');
    });

    return () => embeddableHandler.destroy();
  }, [embeddableHandler, eventEmitter]);

  useEffect(() => {
    embeddableHandler.updateInput({
      timeRange,
      filters,
      query,
    });
  }, [embeddableHandler, timeRange, filters, query]);

  const editorInitialWidth = getInitialWidth(vis.type.editorConfig.defaultSize);

  return (
    <core.i18n.Context>
      <KibanaContextProvider
        services={{
          appName: 'vis_default_editor',
          storage: localStorage,
          data,
          ...core,
        }}
      >
        <PanelsContainer
          className="visEditor--default"
          resizerClassName={`visEditor__resizer ${
            isCollapsed ? 'visEditor__resizer-isHidden' : ''
          }`}
        >
          <Panel className="visEditor__visualization" initialWidth={100 - editorInitialWidth}>
            <div className="visEditor__canvas" ref={visRef} data-shared-items-container />
          </Panel>

          <Panel
            className={`visEditor__collapsibleSidebar ${
              isCollapsed ? 'visEditor__collapsibleSidebar-isClosed' : ''
            }`}
            initialWidth={editorInitialWidth}
          >
            <DefaultEditorSideBar
              embeddableHandler={embeddableHandler}
              isCollapsed={isCollapsed}
              onClickCollapse={onClickCollapse}
              vis={vis}
              uiState={uiState}
              isLinkedSearch={linked}
              savedSearch={savedSearch}
              timeRange={timeRange}
              eventEmitter={eventEmitter}
            />
          </Panel>
        </PanelsContainer>
      </KibanaContextProvider>
    </core.i18n.Context>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { DefaultEditor as default };
