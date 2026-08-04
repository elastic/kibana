import React from 'react';
import type moment from 'moment';
import type { ManualEventAnnotationType } from './types';
export declare const ConfigPanelApplyAsRangeSwitch: ({ annotation, onChange, getDefaultRangeEnd, }: {
    annotation?: ManualEventAnnotationType;
    onChange: <T extends ManualEventAnnotationType>(annotations: Partial<T> | undefined) => void;
    getDefaultRangeEnd: (rangeStart: string) => string;
}) => React.JSX.Element;
export declare const ConfigPanelRangeDatePicker: ({ value, label, prependLabel, onChange, calendarClassName, dataTestSubj, }: {
    value: moment.Moment;
    prependLabel?: string;
    label?: string;
    onChange: (val: moment.Moment | null) => void;
    calendarClassName: string | undefined;
    dataTestSubj?: string;
}) => React.JSX.Element;
