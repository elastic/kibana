import React from 'react';
import type { StepInfo } from '@kbn/workflows-yaml';
import type { RenderStepIcon } from './workflow_graph_actions_context';
export type WorkflowVisualEditorFlyoutTarget = {
    kind: 'step';
    stepName: string;
    stepType?: string;
    stepInfo?: StepInfo;
    yamlSnippet?: string;
} | {
    kind: 'trigger';
    triggerType: string;
    triggerLabel: string;
    yamlSnippet: string;
};
export interface WorkflowVisualEditorFlyoutProps {
    readonly target: WorkflowVisualEditorFlyoutTarget;
    readonly editorYaml: string;
    readonly canExecuteWorkflow: boolean;
    readonly isYamlValid: boolean;
    readonly onClose: () => void;
    readonly onOpenInYaml?: () => void;
    readonly onRunStep?: () => void;
    readonly renderMoreMenuItems?: (closeMenu: () => void) => JSX.Element[];
    readonly onMoreMenuOpen?: () => void;
    readonly renderStepIcon?: RenderStepIcon;
}
export declare function WorkflowVisualEditorFlyout({ target, editorYaml, canExecuteWorkflow, isYamlValid, onClose, onOpenInYaml, onRunStep, renderMoreMenuItems, onMoreMenuOpen, renderStepIcon, }: WorkflowVisualEditorFlyoutProps): React.JSX.Element;
