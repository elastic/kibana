import React, { type ReactNode } from 'react';
export type WorkflowDetailBottomBarView = 'yaml' | 'graph';
/**
 * Published by `WorkflowDetailBottomBar` so any popovers anchored to its
 * buttons (e.g. keyboard shortcuts, editor settings) can close themselves
 * when the bar auto-collapses to the small pill — otherwise the popover
 * stays floating on the canvas with no visible anchor.
 */
interface WorkflowBottomBarContextValue {
    isExpanded: boolean;
}
export declare function useWorkflowBottomBarState(): WorkflowBottomBarContextValue;
export interface ToolMenuItemDef {
    iconType: string;
    label: string;
    onClick?: () => void;
    href?: string;
    target?: string;
}
export interface WorkflowDetailBottomBarProps {
    editorView: WorkflowDetailBottomBarView;
    onEditorViewChange: (next: WorkflowDetailBottomBarView) => void;
    /**
     * Leftmost slot shown only in YAML view (e.g. "add step" + documentation).
     * Mirrors ZoomControls in graph view.
     */
    yamlActionsSlot?: ReactNode;
    toolsSlot?: ReactNode;
    /** Structured list of tool actions rendered as a named list inside the compact ⋮ popover. */
    toolsMenuItems?: ToolMenuItemDef[];
    testWorkflowButton?: ReactNode;
    /** Icon-only variant of testWorkflowButton shown in compact mode. Falls back to testWorkflowButton if not provided. */
    testWorkflowButtonCompact?: ReactNode;
    /**
     * Extra space (in px) to add to the bar's `bottom` offset. Useful when an
     * expandable panel below (e.g. validation errors) would otherwise overlap
     * the bar.
     */
    bottomOffset?: number;
    /**
     * When true, the bar stays expanded indefinitely — the 5s post-mount
     * auto-collapse and the 600ms mouseLeave collapse are both skipped. The
     * collapsed pill is hidden as well. Wired up to the "Hide controls menu"
     * setting in the settings popover.
     */
    disableAutoCollapse?: boolean;
    /**
     * When false, the view-toggle (Graph / YAML switch) is hidden. Use this
     * to suppress the toggle when the graph view is not available.
     */
    showViewToggle?: boolean;
}
export declare function WorkflowDetailBottomBar({ editorView, onEditorViewChange, yamlActionsSlot, toolsSlot, toolsMenuItems, testWorkflowButton, testWorkflowButtonCompact, bottomOffset, disableAutoCollapse, showViewToggle, }: WorkflowDetailBottomBarProps): React.JSX.Element;
export {};
