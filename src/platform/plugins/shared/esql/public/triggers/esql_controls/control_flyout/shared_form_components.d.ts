import React from 'react';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { EsqlControlType } from '@kbn/esql-types';
import { type EuiSwitchEvent } from '@elastic/eui';
export declare function ControlType({ isDisabled, initialControlFlyoutType, onFlyoutTypeChange, }: {
    isDisabled: boolean;
    initialControlFlyoutType: EsqlControlType;
    onFlyoutTypeChange?: (flyoutType: EsqlControlType) => void;
}): React.JSX.Element;
export declare function VariableName({ variableName, isControlInEditMode, esqlVariables, onVariableNameChange, }: {
    variableName: string;
    isControlInEditMode: boolean;
    esqlVariables?: ESQLControlVariable[];
    onVariableNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}): React.JSX.Element;
export declare function ControlLabel({ label, onLabelChange, }: {
    label: string;
    onLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}): React.JSX.Element;
export declare function ControlWidth({ minimumWidth, grow, hideFitToSpace, onMinimumSizeChange, onGrowChange, }: {
    minimumWidth: string;
    grow: boolean;
    hideFitToSpace: boolean;
    onMinimumSizeChange: (id: string) => void;
    onGrowChange: (e: EuiSwitchEvent) => void;
}): React.JSX.Element;
export declare function ControlSelectionType({ singleSelect, onSelectionTypeChange, }: {
    singleSelect: boolean;
    onSelectionTypeChange: (isSingleSelect: boolean) => void;
}): React.JSX.Element;
export declare function Header({ isInEditMode, ariaLabelledBy, }: {
    isInEditMode: boolean;
    ariaLabelledBy: string;
}): React.JSX.Element;
export declare function Footer({ onCancelControl, isSaveDisabled, closeFlyout, onCreateControl, }: {
    isSaveDisabled: boolean;
    closeFlyout: () => void;
    onCreateControl: () => void;
    onCancelControl?: () => void;
}): React.JSX.Element;
