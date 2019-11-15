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

import { start as embeddables } from '../../../../../core_plugins/embeddable_api/public/np_ready/public/legacy';
import { VisualizeEmbeddable } from '../../../../../core_plugins/kibana/public/visualize/embeddable';
import { VisualizeEmbeddableFactory } from '../../../../../core_plugins/kibana/public/visualize/embeddable/visualize_embeddable_factory';
import { EditorRenderProps } from '../../../../../core_plugins/kibana/public/visualize/types';

import './vis_type_agg_filter';
import { DefaultEditorSideBar } from './components/sidebar';
import { DefaultEditorBottomBar } from './components/bottom_bar';
import { useEditorReducer, useEditorContext, useEditorFormState } from './state';
import { DefaultEditorControllerState } from './default_editor_controller';

const sidebarClassName = 'visEditor__collapsibleSidebar';

function DefaultEditor({
  savedObj,
  uiState,
  timeRange,
  filters,
  appState,
  optionTabs,
  query,
}: DefaultEditorControllerState & EditorRenderProps) {
  const visRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [visHandler, setVisHandler] = useState<VisualizeEmbeddable | null>(null);
  const [factory, setFactory] = useState<VisualizeEmbeddableFactory | null>(null);
  const { vis } = savedObj;
  const { isDirty, setDirty } = useEditorContext();
  const [state, dispatch] = useEditorReducer(vis);
  const { formState, setTouched, setValidity } = useEditorFormState();

  useEffect(() => {
    async function visualize() {
      if (!visRef.current || (!visHandler && factory)) {
        return;
      }

      if (!visHandler) {
        const embeddableFactory = embeddables.getEmbeddableFactory(
          'visualization'
        ) as VisualizeEmbeddableFactory;
        setFactory(embeddableFactory);

        const handler = (await embeddableFactory.createFromObject(savedObj, {
          // should be look through createFromObject interface again because of "id" param
          id: '',
          uiState,
          appState,
          timeRange,
          filters,
          query,
        })) as VisualizeEmbeddable;

        setVisHandler(handler);

        handler.render(visRef.current);
      } else {
        visHandler.updateInput({
          timeRange,
          filters,
          query,
        });
      }
    }

    visualize();
  }, [visRef.current, visHandler, uiState, savedObj, timeRange, filters, appState, query]);

  useEffect(() => {
    vis.on('dirtyStateChange', ({ isDirty: dirty }: { isDirty: boolean }) => {
      setDirty(dirty);
    });
  }, [vis]);

  const applyChanges = useCallback(() => {
    if (formState.invalid || !isDirty) {
      setTouched(true);

      return;
    }

    vis.setCurrentState(state);
    vis.updateState();
    vis.emit('dirtyStateChange', {
      isDirty: false,
    });
    setDirty(false);
    setTouched(false);
  }, [vis, state, formState.invalid, setDirty, setTouched]);

  return (
    <>
      <div className="visEditor--default">
        <div className="visEditor__canvas" ref={visRef} />

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
            applyChanges={applyChanges}
            dispatch={dispatch}
            formIsTouched={formState.touched}
            optionTabs={optionTabs}
            setTouched={setTouched}
            setValidity={setValidity}
            state={state}
            vis={vis}
            uiState={uiState}
          />
        </div>
      </div>

      <DefaultEditorBottomBar
        applyChanges={applyChanges}
        dispatch={dispatch}
        isDirty={isDirty}
        isTouched={formState.touched}
        isInvalid={formState.invalid}
        vis={vis}
      />
    </>
  );
}

export { DefaultEditor };
