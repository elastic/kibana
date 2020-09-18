/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './index.scss';

import React, { useEffect, useRef, useState, useCallback } from 'react';

import { EditorRenderProps } from 'src/plugins/visualize/public';
import { KibanaContextProvider, PanelsContainer, Panel } from '../../kibana_react/public';
import { Storage } from '../../kibana_utils/public';

import { DefaultEditorSideBar } from './components/sidebar';
import { DefaultEditorControllerState } from './default_editor_controller';
import { getInitialWidth } from './editor_size';

const localStorage = new Storage(window.localStorage);

function DefaultEditor({
  core,
  data,
  vis,
  uiState,
  timeRange,
  filters,
  optionTabs,
  query,
  embeddableHandler,
  eventEmitter,
  linked,
  savedSearch,
}: DefaultEditorControllerState & EditorRenderProps) {
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
              optionTabs={optionTabs}
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
