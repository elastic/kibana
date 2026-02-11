/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
  ResizableLayoutOrder,
} from '@kbn/resizable-layout';

interface WorkflowDetailLayoutProps {
  editor: React.ReactNode;
  executionList: React.ReactNode | null;
  executionDetail: React.ReactNode | null;
}
type SideBarMode = 'list' | 'detail';

interface WorkflowEditorWithSidebarLayoutProps {
  editorPortal: React.ReactNode;
  mode: SideBarMode;
  sideBarPortal: React.ReactNode;
}

const WorkflowsSidebarWidthPrefix = 'WORKFLOWS_SIDEBAR_WIDTH_';

const MinSidebarModeWidth: Record<SideBarMode, number> = {
  list: 200,
  detail: 400,
};
const MinEditorWidth = 400;

/**
 * Layout for the workflow editor page, it receives the editor and the different sidebar components
 * If no sidebar is provided, it just renders the editor full width
 * If a sidebar is provided, it renders the editor and the sidebar in a resizable layout
 * The sidebar can be either the execution list or the execution detail
 */
export const WorkflowEditorLayout = ({
  editor,
  executionList,
  executionDetail,
}: WorkflowDetailLayoutProps) => {
  // Create portal nodes to prevent re-mounting of the editor when sideBarMode changes
  const [editorPortalNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );
  const [sideBarPortalNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );

  const sideBarMode = useMemo<SideBarMode | undefined>(() => {
    if (executionList) {
      return 'list';
    } else if (executionDetail) {
      return 'detail';
    }
  }, [executionDetail, executionList]);

  return (
    <>
      <InPortal node={editorPortalNode}>{editor}</InPortal>

      {sideBarMode && (
        <InPortal node={sideBarPortalNode}>
          {sideBarMode === 'list' ? executionList : executionDetail}
        </InPortal>
      )}

      {!sideBarMode ? (
        <OutPortal node={editorPortalNode} />
      ) : (
        <WorkflowEditorWithSidebarLayout
          editorPortal={<OutPortal node={editorPortalNode} />}
          mode={sideBarMode}
          sideBarPortal={<OutPortal node={sideBarPortalNode} />}
        />
      )}
    </>
  );
};

/**
 * Layout for the workflow editor with a sidebar.
 * Reuses the ResizableLayout component from @kbn/resizable-layout
 */
const WorkflowEditorWithSidebarLayout = ({
  editorPortal,
  mode,
  sideBarPortal,
}: WorkflowEditorWithSidebarLayoutProps) => {
  const defaultSidebarWidth = Math.floor(window.innerWidth * 0.5);

  const [sidebarWidth = defaultSidebarWidth, setSidebarWidth] = useLocalStorage(
    `${WorkflowsSidebarWidthPrefix}${mode.toUpperCase()}`,
    defaultSidebarWidth
  );

  return (
    <ResizableLayout
      flexPanel={editorPortal}
      minFlexPanelSize={MinEditorWidth}
      fixedPanel={sideBarPortal}
      fixedPanelSize={sidebarWidth}
      onFixedPanelSizeChange={setSidebarWidth}
      minFixedPanelSize={MinSidebarModeWidth[mode]}
      fixedPanelOrder={ResizableLayoutOrder.End}
      mode={ResizableLayoutMode.Resizable}
      direction={ResizableLayoutDirection.Horizontal}
      resizeButtonClassName="workflowSidebarResizeButton"
      data-test-subj="WorkflowEditorWithSidebarLayout"
      className="workflowResizableLayout"
    />
  );
};
