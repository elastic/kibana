import React from 'react';
export interface BarSegment {
    id: string;
    left: number;
    width: number;
    color: string;
}
export declare function Bar({ width, left, color, segments, duration, composite, }: {
    width: number;
    left: number;
    color: string;
    segments?: BarSegment[];
    duration?: number;
    composite?: {
        count: number;
        sum: number;
    };
}): React.JSX.Element;
export declare function getBarStyle(color: string, duration?: number, composite?: {
    count: number;
    sum: number;
}): {
    backgroundColor: string;
    backgroundImage?: undefined;
} | {
    backgroundImage: string;
    backgroundColor: string;
};
