import React from 'react';
export declare enum VisorMode {
    KQL = "kql",
    NaturalLanguage = "nl"
}
interface ModeSelectorProps {
    onModeChange: (mode: VisorMode) => void;
}
export declare function ModeSelector({ onModeChange }: ModeSelectorProps): React.JSX.Element;
export {};
