/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'brace/mode/json';
import './index.scss';

import { EuiResizableContainer } from '@elastic/eui';
import { EventEmitter } from 'events';
import React, { useCallback, useEffect, useState } from 'react';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import {
  EditorRenderProps,
  EmbeddableApiHandler,
  Vis,
  VISUALIZE_EMBEDDABLE_TYPE,
} from '@kbn/visualizations-plugin/public';

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  VisualizeApi,
  VisualizeSerializedState,
} from '@kbn/visualizations-plugin/public/react_embeddable/types';
import { BehaviorSubject } from 'rxjs';
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
  embeddableApiHandler,
  eventEmitter,
  linked,
  savedSearch,
}: EditorRenderProps & {
  vis: Vis;
  eventEmitter: EventEmitter;
  embeddableApiHandler: EmbeddableApiHandler;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [parentApi] = useState({
    timeRange$: new BehaviorSubject(timeRange),
    query$: new BehaviorSubject(query),
    filters$: new BehaviorSubject(filters),
  });

  const onClickCollapse = useCallback(() => {
    setIsCollapsed((value) => !value);
  }, []);

  /**
   * The empty callback is in place to prevent resetting the dragging state of the resize button.
   * The mouseLeave is triggered since a visualization is rendered through another call of "ReactDOM.render()"" in expressions,
   * using the "visRef" node reference.
   * Here is the existing React issue: https://github.com/facebook/react/issues/17064
   */
  const onEditorMouseLeave = useCallback(() => {}, []);

  useEffect(() => {
    parentApi.timeRange$.next(timeRange);
  }, [parentApi, timeRange]);
  useEffect(() => {
    parentApi.query$.next(query);
  }, [parentApi, query]);
  useEffect(() => {
    parentApi.filters$.next(filters);
  }, [parentApi, filters]);

  const editorInitialWidth = getInitialWidth(vis.type.editorConfig.defaultSize);

  return (
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider
        services={{
          appName: 'vis_default_editor',
          storage: localStorage,
          data,
          ...core,
        }}
      >
        <EuiResizableContainer className="visEditor--default" onMouseLeave={onEditorMouseLeave}>
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                className="visEditor__visualization"
                initialSize={100 - editorInitialWidth}
                minSize="25%"
                paddingSize="none"
                wrapperProps={{
                  className: `visEditor__visualization__wrapper ${
                    isCollapsed ? 'visEditor__visualization__wrapper-expanded' : ''
                  }`,
                }}
              >
                <ReactEmbeddableRenderer<VisualizeSerializedState, VisualizeApi>
                  type={VISUALIZE_EMBEDDABLE_TYPE}
                  getParentApi={() => ({
                    ...parentApi,
                    getSerializedStateForChild: () => ({
                      rawState: {
                        id: '',
                        savedVis: vis.serialize(),
                      },
                      references: [],
                    }),
                  })}
                  onApiAvailable={(api) => {
                    api.subscribeToInitialRender(() => eventEmitter.emit('embeddableRendered'));
                    const [, setOpenInspector] = embeddableApiHandler.openInspector;
                    setOpenInspector(() => api.openInspector);
                  }}
                />
              </EuiResizablePanel>

              <EuiResizableButton
                alignIndicator="start"
                className={`visEditor__resizer ${isCollapsed ? 'visEditor__resizer-isHidden' : ''}`}
              />

              <EuiResizablePanel
                initialSize={editorInitialWidth}
                minSize={isCollapsed ? '0' : '350px'}
                paddingSize="none"
                wrapperProps={{
                  className: `visEditor__collapsibleSidebar ${
                    isCollapsed ? 'visEditor__collapsibleSidebar-isClosed' : ''
                  }`,
                }}
              >
                <DefaultEditorSideBar
                  isCollapsed={isCollapsed}
                  onClickCollapse={onClickCollapse}
                  vis={vis}
                  uiState={uiState}
                  isLinkedSearch={linked}
                  savedSearch={savedSearch}
                  timeRange={timeRange}
                  eventEmitter={eventEmitter}
                />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { DefaultEditor as default };
