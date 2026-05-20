import React from 'react';
export declare enum HitsCounterMode {
    standalone = "standalone",
    appended = "appended"
}
export interface HitsCounterProps {
    mode: HitsCounterMode;
    hitCounterLabel?: string;
    hitCounterPluralLabel?: string;
    hitsTotalToDisplay?: number;
}
export declare const HitsCounter: React.FC<HitsCounterProps>;
