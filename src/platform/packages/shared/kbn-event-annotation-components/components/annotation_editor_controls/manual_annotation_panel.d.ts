import React from 'react';
import type { ManualEventAnnotationType } from './types';
export declare const ConfigPanelManualAnnotation: ({ annotation, onChange, getDefaultRangeEnd, calendarClassName, }: {
    annotation?: ManualEventAnnotationType | undefined;
    onChange: <T extends ManualEventAnnotationType>(annotation: Partial<T> | undefined) => void;
    getDefaultRangeEnd: (rangeStart: string) => string;
    calendarClassName: string | undefined;
}) => React.JSX.Element;
