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

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { getVisualizeLoader, EmbeddedVisualizeHandler } from 'ui/visualize';
import { AggConfigs } from 'ui/agg_types';
import { VisEditorSideBar } from './vis_editor_sidebar';
import { DefaultEditorBottomBar } from './components/bottom_bar';

const sidebarClassName = 'visEditor__collapsibleSidebar';

function initEditorState(vis) {
  return vis.copyCurrentState(true);
}

function editorStateReducer(state, action) {
  switch (action.type) {
    case 'setAggParamValue': {
      const { aggId, paramName, value } = action.payload;

      const newAggs = state.aggs.aggs.map(agg => {
        if (agg.id === aggId) {
          const parsedAgg = agg.toJSON();

          return {
            ...parsedAgg,
            params: {
              ...parsedAgg.params,
              [paramName]: value,
            },
          };
        }

        return agg;
      });

      return {
        ...state,
        aggs: new AggConfigs(state.aggs.indexPattern, newAggs, state.aggs.schemas),
      };
    }
    case 'addNewAgg': {
      const newAggs = [...state.aggs.aggs, state.aggs.createAggConfig(action.payload)];

      return {
        ...state,
        aggs: new AggConfigs(state.aggs.indexPattern, newAggs, state.aggs.schemas),
      };
    }

    case 'discardChanges': {
      return initEditorState(action.payload);
    }
  }
}

function DefaultEditor({ el, savedObj, uiState, timeRange, filters, appState, vis, optionTabs }) {
  const visRef = useRef<HTMLDivElement>(null);
  const [visHandler, setVisHandler] = useState<EmbeddedVisualizeHandler | null>(null);

  useEffect(() => {
    async function visualize() {
      if (!visRef.current) {
        return;
      }

      if (!visHandler) {
        const loader = await getVisualizeLoader();
        const handler = loader.embedVisualizationWithSavedObject(visRef.current, savedObj, {
          uiState,
          listenOnChange: false,
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

  const onParamChange = (params, paramName, value) => {
    if (params[paramName] !== value) {
      params[paramName] = value;
    }
  };

  const setVisType = type => {
    vis.type.type = type;
  };

  const [state, dispatch] = useReducer(editorStateReducer, vis, initEditorState);

  return (
    <div className="visEditor--default">
      <div
        className="visEditor__canvas"
        ref={visRef}
        data-shared-item
        data-shared-items-container
        render-complete
        data-title={vis.title}
        data-description={vis.description}
      />

      <button className="visEditor__resizer">
        <i className="fa fa-ellipsis-h" />
      </button>

      <div
        className={`collapsible-sidebar ${sidebarClassName} ${
          vis.type.editorConfig.defaultSize
            ? `visEditor__collapsibleSidebar--${vis.type.editorConfig.defaultSize}`
            : ''
        }`}
      >
        <VisEditorSideBar
          optionTabs={optionTabs}
          vis={vis}
          state={state}
          onParamChange={onParamChange}
          uiState={uiState}
          setVisType={setVisType}
          dispatch={dispatch}
        />
      </div>

      <DefaultEditorBottomBar dispatch={dispatch} vis={vis} />
    </div>
  );
}

export { DefaultEditor };
