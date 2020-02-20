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

import React, { useEffect, useRef, useState, useCallback } from 'react';

import { EditorRenderProps } from '../../kibana/public/visualize/np_ready/types';
import { VisualizeEmbeddable } from '../../visualizations/public/embeddable';
import { VisualizeEmbeddableFactory } from '../../visualizations/public/embeddable/visualize_embeddable_factory';
import { PanelsContainer, Panel } from '../../../../plugins/kibana_react/public';

import './vis_type_agg_filter';
import { DefaultEditorSideBar } from './components/sidebar';
import { DefaultEditorControllerState } from './default_editor_controller';
import { getInitialWidth } from './editor_size';

function DefaultEditor({
  embeddable,
  savedObj,
  uiState,
  timeRange,
  filters,
  appState,
  optionTabs,
  query,
}: DefaultEditorControllerState & Omit<EditorRenderProps, 'data' | 'core'>) {
  const visRef = useRef<HTMLDivElement>(null);
  const visHandler = useRef<VisualizeEmbeddable | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [factory, setFactory] = useState<VisualizeEmbeddableFactory | null>(null);
  const { vis } = savedObj;

  const onClickCollapse = useCallback(() => {
    setIsCollapsed(value => !value);
  }, []);

  useEffect(() => {
    async function visualize() {
      if (!visRef.current || (!visHandler.current && factory)) {
        return;
      }

      if (!visHandler.current) {
        const embeddableFactory = embeddable.getEmbeddableFactory(
          'visualization'
        ) as VisualizeEmbeddableFactory;
        setFactory(embeddableFactory);

        visHandler.current = (await embeddableFactory.createFromObject(savedObj, {
          // should be look through createFromObject interface again because of "id" param
          id: '',
          uiState,
          appState,
          timeRange,
          filters,
          query,
        })) as VisualizeEmbeddable;

        visHandler.current.render(visRef.current);
      } else {
        visHandler.current.updateInput({
          timeRange,
          filters,
          query,
        });
      }
    }

    visualize();
  }, [uiState, savedObj, timeRange, filters, appState, query, factory, embeddable]);

  useEffect(() => {
    return () => {
      if (visHandler.current) {
        visHandler.current.destroy();
      }
    };
  }, []);

  const editorInitialWidth = getInitialWidth(vis.type.editorConfig.defaultSize);

  return (
    <PanelsContainer
      className="visEditor--default"
      resizerClassName={`visEditor__resizer ${isCollapsed ? 'visEditor__resizer-isHidden' : ''}`}
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
          isCollapsed={isCollapsed}
          onClickCollapse={onClickCollapse}
          optionTabs={optionTabs}
          vis={vis}
          uiState={uiState}
        />
      </Panel>
    </PanelsContainer>
  );
}

export { DefaultEditor };
