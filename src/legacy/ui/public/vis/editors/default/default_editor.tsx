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

import React, { useEffect, useRef, useState } from 'react';

import { getVisualizeLoader } from 'ui/visualize';
import { EmbeddedVisualizeHandler } from 'ui/visualize/loader/embedded_visualize_handler';
import { EditorRenderProps } from 'src/legacy/core_plugins/kibana/public/visualize/types';

import { DefaultEditorSideBar } from './components/sidebar';
import { DefaultEditorBottomBar } from './components/bottom_bar';
import { useEditorReducer } from './state';
import { DefaultEditorControllerState } from './default_editor_controller';
// import { Resizer } from './resizer';

const sidebarClassName = 'visEditor__collapsibleSidebar';

function DefaultEditor({
  savedObj,
  uiState,
  timeRange,
  filters,
  appState,
  optionTabs,
}: DefaultEditorControllerState & EditorRenderProps) {
  const visRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [visHandler, setVisHandler] = useState<EmbeddedVisualizeHandler | null>(null);
  // const [sidebarStyle, setSidebarStyle] = useState({});
  const { vis } = savedObj;
  const [state, dispatch] = useEditorReducer(vis);

  useEffect(() => {
    async function visualize() {
      if (!visRef.current) {
        return;
      }

      if (!visHandler) {
        const loader = await getVisualizeLoader();
        const handler = loader.embedVisualizationWithSavedObject(visRef.current, savedObj, {
          uiState,
          timeRange,
          filters,
          appState,
        });

        setVisHandler(handler);
      } else {
        visHandler.update({
          timeRange,
          filters,
        });
      }
    }

    visualize();
  }, [visRef.current, visHandler, uiState, savedObj, timeRange, filters, appState]);

  // const onResize = useCallback(width => {
  //   setSidebarStyle(style => ({ ...style, width }));
  // }, []);

  return (
    <div className="visEditor--default">
      <div
        className="visEditor__canvas"
        ref={visRef}
        data-shared-item=""
        data-shared-items-container=""
        render-complete=""
        data-title={vis.title}
        data-description={vis.description}
      />

      {/* <Resizer direction="horizontal" element={sidebarRef} onResize={onResize} /> */}

      <div
        className={`collapsible-sidebar ${sidebarClassName} ${
          vis.type.editorConfig.defaultSize
            ? `visEditor__collapsibleSidebar--${vis.type.editorConfig.defaultSize}`
            : ''
        }`}
        ref={sidebarRef}
      >
        <DefaultEditorSideBar
          optionTabs={optionTabs}
          vis={vis}
          state={state}
          uiState={uiState}
          dispatch={dispatch}
        />
      </div>

      <DefaultEditorBottomBar dispatch={dispatch} state={state} vis={vis} />
    </div>
  );
}

export { DefaultEditor };
