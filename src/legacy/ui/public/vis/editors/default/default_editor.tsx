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
import { Filter } from '@kbn/es-query';

import { PersistedState } from 'ui/persisted_state';
import { AppState } from 'ui/state_management/app_state';
import { getVisualizeLoader, EmbeddedVisualizeHandler } from 'ui/visualize';
import { VisSavedObject } from 'ui/visualize/loader/types';
import { Vis } from 'ui/vis';
import { TimeRange } from 'src/plugins/data/public';

import { DefaultEditorSideBar, OptionTab } from './components/sidebar';
import { DefaultEditorBottomBar } from './components/bottom_bar';
import { useEditorContext, useEditorReducer } from './state';
// import { Resizer } from './resizer';

const sidebarClassName = 'visEditor__collapsibleSidebar';

interface DefaultEditorProps {
  el: HTMLElement;
  filters: Filter[];
  uiState: PersistedState;
  timeRange: TimeRange;
  appState: AppState;
  vis: Vis;
  savedObj: VisSavedObject;
  optionTabs: OptionTab[];
}

function DefaultEditor({
  savedObj,
  uiState,
  timeRange,
  filters,
  appState,
  vis,
  optionTabs,
}: DefaultEditorProps) {
  const visRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [visHandler, setVisHandler] = useState<EmbeddedVisualizeHandler | null>(null);
  // const [sidebarStyle, setSidebarStyle] = useState({});
  const { isDirty, setDirty } = useEditorContext();
  const [state, actions] = useEditorReducer(vis);

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

  const setVisType = type => {
    vis.type.type = type;
  };

  useEffect(() => {
    vis.on('dirtyStateChange', ({ isDirty: dirty }: { isDirty: boolean }) => {
      setDirty(dirty);
    });
  }, [vis]);

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
          setVisType={setVisType}
          actions={actions}
        />
      </div>

      <DefaultEditorBottomBar discardChanges={actions.discardChanges} isDirty={isDirty} vis={vis} />
    </div>
  );
}

export { DefaultEditor };
