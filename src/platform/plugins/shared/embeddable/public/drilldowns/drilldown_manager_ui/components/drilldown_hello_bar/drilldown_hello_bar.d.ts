import React from 'react';
export interface DrilldownHelloBarProps {
    docsLink?: string;
    onHideClick?: () => void;
}
export declare const WELCOME_MESSAGE_TEST_SUBJ = "drilldownsWelcomeMessage";
export declare const DrilldownHelloBar: React.FC<DrilldownHelloBarProps>;
