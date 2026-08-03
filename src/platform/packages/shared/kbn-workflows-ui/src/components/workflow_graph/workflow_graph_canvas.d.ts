import { type ColorMode, type Viewport } from '@xyflow/react';
import React from 'react';
import type { LayoutDirection, TransformResult, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import '@xyflow/react/dist/style.css';
import { type RenderStepIcon } from './workflow_graph_actions_context';
export interface WorkflowGraphCanvasProps {
    readonly workflow: WorkflowYaml | undefined;
    /** Optional precomputed transform result for this workflow snapshot. */
    readonly transformed?: TransformResult;
    readonly stepExecutions?: WorkflowStepExecutionDto[];
    readonly isYamlValid: boolean;
    /** Optional UI rendered inside the ReactFlow canvas (e.g. top-left toolbar). */
    readonly toolbar?: React.ReactNode;
    readonly selectedStepId?: string;
    readonly onStepSelect: (stepId: string | undefined) => void;
    readonly onNodeClick?: (stepId: string, stepType: string) => void;
    readonly onLayoutFailed?: (reason: string) => void;
    readonly onPerfMark?: (name: 'transform_ms' | 'layout_ms' | 'first_paint_ms', ms: number) => void;
    readonly colorMode?: ColorMode;
    /** Triggered by the hover "Run step" icon on a node. */
    readonly onStepRun?: (stepName: string) => void;
    /** Disables the per-node Run action when false. */
    readonly canRunSteps?: boolean;
    /**
     * Optional renderer for step icons. When provided the canvas delegates icon
     * resolution to the caller (e.g. plugin's `<StepIcon/>`) instead of the
     * built-in fallback table. Falls back gracefully when omitted.
     */
    readonly renderStepIcon?: RenderStepIcon;
    /** Dagre rank direction (default `'TB'`). */
    readonly direction?: LayoutDirection;
    /**
     * When true the viewport is fitted to show all nodes on init, overriding the
     * default centre-on-top behaviour.
     */
    readonly fitView?: boolean;
    /** Options forwarded to ReactFlow's fitView when `fitView` is true. */
    readonly fitViewOptions?: {
        readonly padding?: number;
        readonly minZoom?: number;
        readonly maxZoom?: number;
    };
    /** Whether to render the minimap. Pass false to suppress it (e.g. for exports). */
    readonly showMinimap?: boolean;
    /** Whether to render the floating zoom controls in the bottom-right corner. */
    readonly showZoomControls?: boolean;
    /**
     * Whether to render the dot-pattern background and the coloured wrapper div
     * background. Pass false for export canvases that need a transparent output.
     */
    readonly showBackground?: boolean;
    /**
     * Override the z-index applied to every edge. The default (-1) keeps edges
     * below nodes in the live editor, but breaks DOM-to-image capture because
     * negative-z children are clipped by the stacking context. Pass 0 for
     * off-screen export canvases.
     */
    readonly edgeZIndex?: number;
    /**
     * Called once after ReactFlow has initialised and positioned the viewport
     * (including any fitView). Useful for off-screen export canvases that need
     * to know when the graph is ready to capture.
     */
    readonly onReady?: () => void;
    /**
     * When provided, ReactFlow uses this as the initial viewport instead of
     * running the default centering. Pair with `onViewportChange` to persist
     * the user's zoom/pan across canvas remounts (e.g. YAML↔graph toggle).
     */
    readonly defaultViewport?: Viewport;
    /**
     * Fires when the user finishes a pan or zoom gesture. The caller is
     * responsible for storing this so it can be passed back as
     * `defaultViewport` on the next mount.
     */
    readonly onViewportChange?: (viewport: Viewport) => void;
}
declare function WorkflowGraphCanvasInner(props: WorkflowGraphCanvasProps): React.JSX.Element;
/**
 * Inner version of the canvas — does NOT wrap itself in a `ReactFlowProvider`.
 * Use when a parent provides the provider (e.g. so sibling components like
 * the floating bottom bar can `useReactFlow()` against the same flow).
 */
export declare const WorkflowGraphCanvasWithoutProvider: typeof WorkflowGraphCanvasInner;
export {};
