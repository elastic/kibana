/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiPageSidebarProps, UseEuiTheme } from '@elastic/eui';
import { EuiPageSidebar, euiShadow } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { type CSSProperties, type PropsWithChildren, type ReactNode } from 'react';
import { useChromeStyle } from '@kbn/core-chrome-browser-hooks';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { withSolutionNav } from '@kbn/shared-ux-page-solution-nav';
import { useWorkflowsSolutionNav } from './use_workflows_solution_nav';

const componentStyles = {
  layout: () => css`
    display: flex;
    flex-direction: row;
    min-block-size: var(--kbn-application--content-height, 100vh);
  `,
  // Reproduces the `panelled` and `border` treatment `EuiPageTemplate` applies to its content when
  // a sidebar is present. Without it the page and the sidebar share a background and blend into
  // each other, which is most obvious on the full-height workflow editor.
  content: (euiThemeContext: UseEuiTheme) => css`
    flex: 1 1 0;
    /* Lets the editor and data grids shrink instead of widening the column. */
    min-inline-size: 0;
    border-inline-start: ${euiThemeContext.euiTheme.border.thin};
    background: ${euiThemeContext.euiTheme.colors.backgroundBasePlain};
    ${euiShadow(euiThemeContext, 'm', { border: 'none' })}
  `,
};

// Copied from `KibanaPageTemplateInner`: `EuiPageSidebar`'s own `sticky` prop positions the sidebar
// incorrectly in the grid layout (elastic/eui#8820), so the offsets are applied by hand instead.
const stickySidebarStyle: CSSProperties = {
  maxHeight: 'var(--kbn-application--content-height, 100vh)',
  top: 'var(--euiFixedHeadersOffset, 0px)',
  position: 'sticky',
};

interface WorkflowsAppShellProps {
  children?: ReactNode;
  pageSideBar?: ReactNode;
  pageSideBarProps?: EuiPageSidebarProps;
}

/**
 * The page shell `withSolutionNav` renders into. It plays the same role as
 * `KibanaPageTemplateInner` does for `KibanaPageTemplate`, without owning the page itself —
 * the Workflows pages bring their own `EuiPageTemplate` or full-height layout.
 */
const WorkflowsAppShell = ({ children, pageSideBar, pageSideBarProps }: WorkflowsAppShellProps) => {
  const styles = useMemoCss(componentStyles);

  return (
    <div css={styles.layout} data-test-subj="workflowsAppLayout">
      <EuiPageSidebar
        {...pageSideBarProps}
        sticky={false}
        style={stickySidebarStyle}
        data-test-subj="workflowsAppSidebar"
      >
        {pageSideBar}
      </EuiPageSidebar>
      <div css={styles.content}>{children}</div>
    </div>
  );
};

const WorkflowsAppShellWithSolutionNav = withSolutionNav(WorkflowsAppShell);

/**
 * Adds the Workflows side navigation in classic chrome, where there is otherwise
 * no way to reach the Template Library or the global Executions view. Solution
 * navigation renders those links in its own panel, so the sidebar stays out of it.
 */
export const WorkflowsAppLayout: React.FC<PropsWithChildren> = ({ children }) => {
  const chromeStyle = useChromeStyle();
  const solutionNav = useWorkflowsSolutionNav();

  if (chromeStyle !== 'classic' || !solutionNav) {
    return children;
  }

  return (
    <WorkflowsAppShellWithSolutionNav solutionNav={solutionNav}>
      {children}
    </WorkflowsAppShellWithSolutionNav>
  );
};
