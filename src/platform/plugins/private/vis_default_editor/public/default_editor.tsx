/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EventEmitter } from 'events';
import { EuiResizableContainer, type UseEuiTheme, euiBreakpoint } from '@elastic/eui';

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import {
  Vis,
  VisualizeEmbeddableContract,
  EditorRenderProps,
} from '@kbn/visualizations-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { DefaultEditorSideBar } from './components/sidebar';
import { getInitialWidth } from './editor_size';

const localStorage = new Storage(window.localStorage);

const defaultEditorStyles = {
  base: (euiThemeContext: UseEuiTheme) =>
    css({
      flex: '1 1 auto',
      display: 'flex',
      [euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])]: {
        flexDirection: 'column', // change the editor direction to column
      },
    }),
  // Collapsible sidebar container
  collapsibleSidebar: (euiThemeContext: UseEuiTheme) =>
    css({
      flexGrow: 1,
      [euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])]: {
        width: '100% !important', // force the editor to take 100% width
        flexGrow: 0,
      },
    }),
  // !importants on width and height are required to override resizable panel inline widths
  collapsibleSidebarIsClosed: (euiThemeContext: UseEuiTheme) =>
    css({
      minWidth: 0,
      width: `${euiThemeContext.euiTheme.size.xl} !important`, // Just enough room for the collapse button
      '.visEditorSidebar': {
        display: 'none',
        paddingLeft: 0,
      },
      [euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])]: {
        height: `${euiThemeContext.euiTheme.size.xxl} !important`, // Just enough room for the collapse button
      },
    }),
  // Resizer
  resizer: (euiThemeContext: UseEuiTheme) =>
    css({
      height: 'auto',
      [euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])]: {
        display: 'none', // hide the resizer button
      },
    }),
  resizerIsHidden: css({
    display: 'none',
  }),
  // Canvas area
  visWrapper: (euiThemeContext: UseEuiTheme) =>
    css({
      [euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])]: {
        width: '100% !important',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      },
    }),
  visWrapperExpanded: css({ width: '100% !important' }),
  visualization: css({
    display: 'flex',
    flex: '1 1 auto', // Fixes IE bug: the editor overflows a visualization on small screens
    overflow: 'hidden',
  }),
  canvas: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.emptyShade,
      display: 'flex',
      flexDirection: 'row',
      overflow: 'auto',
      flexShrink: 1,
      flexBasis: '100%',
      '.visChart': {
        position: 'relative',
      },
    }),
};

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

  const styles = useMemoCss(defaultEditorStyles);

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
        <EuiResizableContainer
          className="visEditor--default"
          onMouseLeave={onEditorMouseLeave}
          css={styles.base}
        >
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
                  css: [styles.visWrapper, isCollapsed && styles.visWrapperExpanded],
                }}
                css={styles.visualization}
              >
                <div
                  className="visEditor__canvas"
                  ref={visRef}
                  data-shared-items-container
                  css={styles.canvas}
                />
              </EuiResizablePanel>

              <EuiResizableButton
                alignIndicator="start"
                className={`visEditor__resizer ${isCollapsed ? 'visEditor__resizer-isHidden' : ''}`}
                css={[styles.resizer, isCollapsed && styles.resizerIsHidden]}
              />

              <EuiResizablePanel
                initialSize={editorInitialWidth}
                minSize={isCollapsed ? '0' : '350px'}
                paddingSize="none"
                wrapperProps={{
                  className: `visEditor__collapsibleSidebar ${
                    isCollapsed ? 'visEditor__collapsibleSidebar-isClosed' : ''
                  }`,
                  css: [
                    styles.collapsibleSidebar,
                    isCollapsed && styles.collapsibleSidebarIsClosed,
                  ],
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
    </KibanaRenderContextProvider>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { DefaultEditor as default };
