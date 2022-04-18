/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';
import 'brace/mode/json';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EventEmitter } from 'events';
import { EuiResizableContainer } from '@elastic/eui';

import {
  Vis,
  VisualizeEmbeddableContract,
  EditorRenderProps,
} from '@kbn/visualizations-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

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

  /**
   * The empty callback is in place to prevent resetting the dragging state of the resize button.
   * The mouseLeave is triggered since a visualization is rendered through another call of "ReactDOM.render()"" in expressions,
   * using the "visRef" node reference.
   * Here is the existing React issue: https://github.com/facebook/react/issues/17064
   */
  const onEditorMouseLeave = useCallback(() => {}, []);

  useEffect(() => {
    if (!visRef.current) {
      return;
    }

    embeddableHandler.render(visRef.current).then(() => {
      setTimeout(async () => {
        eventEmitter.emit('embeddableRendered');
      });
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
                <div className="visEditor__canvas" ref={visRef} data-shared-items-container />
              </EuiResizablePanel>

              <EuiResizableButton
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
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </KibanaContextProvider>
    </core.i18n.Context>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { DefaultEditor as default };
