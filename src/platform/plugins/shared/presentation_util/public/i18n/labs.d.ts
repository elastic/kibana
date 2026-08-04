import React from 'react';
export declare const LabsStrings: {
    Components: {
        Switch: {
            getKibanaSwitchText: () => {
                name: string;
                help: string;
            };
            getBrowserSwitchText: () => {
                name: string;
                help: string;
            };
            getSessionSwitchText: () => {
                name: string;
                help: string;
            };
        };
        List: {
            getNoProjectsMessage: () => string;
            getNoProjectsInSolutionMessage: (solutionName: string) => string;
        };
        ListItem: {
            getOverrideLegend: () => string;
            getOverriddenIconTipLabel: () => string;
            getEnabledStatusMessage: () => React.JSX.Element;
            getDisabledStatusMessage: () => React.JSX.Element;
        };
        Flyout: {
            getTitleLabel: () => string;
            getDescriptionMessage: () => string;
            getResetToDefaultLabel: () => string;
            getLabFlagsLabel: () => string;
            getRefreshLabel: () => string;
            getCloseButtonLabel: () => string;
        };
    };
};
