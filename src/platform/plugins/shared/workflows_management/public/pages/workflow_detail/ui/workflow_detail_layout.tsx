/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useIsWithinBreakpoints } from '@elastic/eui';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutSide,
} from '@kbn/resizable-layout';
import React, { Fragment, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

interface WorkflowDetailLayoutProps {
  editor: React.ReactNode;
  executionList: React.ReactNode | null;
  executionDetail: React.ReactNode | null;
  singleStepExecutionDetail?: React.ReactNode | null;
}
type SideBarMode = 'list' | 'detail' | 'step';

interface WorkflowEditorWithSidebarLayoutProps {
  editor: React.ReactNode;
  mode: SideBarMode;
  sideBar: React.ReactNode;
}

const WorkflowsSidebarWidthPrefix = 'WORKFLOWS_SIDEBAR_WIDTH_';
const DefaultSidebarModeWidth = {
  list: 400,
  detail: 600,
  step: 400,
};
const MinSidebarModeWidth = {
  list: 200,
  detail: 300,
  step: 200,
};
const MinEditorWidth = 400;

/**
 * Layout for the workflow editor page, it receives the editor and the different sidebar components
 * If no sidebar is provided, it just renders the editor full width
 * If a sidebar is provided, it renders the editor and the sidebar in a resizable layout
 * The sidebar can be either the execution list, the execution detail or the single step execution detail
 */
export const WorkflowEditorLayout = ({
  editor,
  executionList,
  executionDetail,
  singleStepExecutionDetail,
}: WorkflowDetailLayoutProps) => {
  const sideBarMode = useMemo<SideBarMode | undefined>(() => {
    if (executionList) {
      return 'list';
    } else if (executionDetail) {
      return 'detail';
    } else if (singleStepExecutionDetail) {
      return 'step';
    }
  }, [executionDetail, executionList, singleStepExecutionDetail]);

  if (!sideBarMode) {
    return <Fragment data-test-subj="WorkflowEditorLayout">{editor}</Fragment>;
  } else {
    return (
      <WorkflowEditorWithSidebarLayout
        editor={editor}
        mode={sideBarMode}
        sideBar={
          sideBarMode === 'list'
            ? executionList
            : sideBarMode === 'detail'
            ? executionDetail
            : singleStepExecutionDetail
        }
      />
    );
  }
};

/**
 * Layout for the workflow editor with a sidebar.
 * Reuses the ResizableLayout component from @kbn/resizable-layout
 */
const WorkflowEditorWithSidebarLayout = ({
  editor,
  mode,
  sideBar,
}: WorkflowEditorWithSidebarLayoutProps) => {
  const defaultSidebarWidth = DefaultSidebarModeWidth[mode];

  const [sidebarWidth = defaultSidebarWidth, setSidebarWidth] = useLocalStorage(
    `${WorkflowsSidebarWidthPrefix}${mode.toUpperCase()}`,
    defaultSidebarWidth
  );

  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const layoutMode = isMobile ? ResizableLayoutMode.Static : ResizableLayoutMode.Resizable;
  const layoutDirection = isMobile
    ? ResizableLayoutDirection.Vertical
    : ResizableLayoutDirection.Horizontal;

  return (
    <ResizableLayout
      flexPanel={editor}
      minFlexPanelSize={MinEditorWidth}
      fixedPanel={sideBar}
      fixedPanelSize={sidebarWidth}
      onFixedPanelSizeChange={setSidebarWidth}
      minFixedPanelSize={MinSidebarModeWidth[mode]}
      fixedPanelOrder={ResizableLayoutSide.End}
      mode={layoutMode}
      direction={layoutDirection}
      resizeButtonClassName="workflowSidebarResizeButton"
      data-test-subj="WorkflowEditorWithSidebarLayout"
      className="workflowResizableLayout"
    />
  );
};
