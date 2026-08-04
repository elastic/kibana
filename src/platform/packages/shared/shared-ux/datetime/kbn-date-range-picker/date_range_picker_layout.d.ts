import React, { type PropsWithChildren } from 'react';
import { type SerializedStyles } from '@emotion/react';
interface DateRangePickerLayoutProps extends PropsWithChildren {
    /** CSS class name added to the outermost container element. */
    className?: string;
    /** Test subject selector added to the outermost container element. */
    'data-test-subj'?: string;
    /** Additional Emotion CSS styles for the outermost container element. */
    css?: SerializedStyles | SerializedStyles[];
}
/**
 * Outer layout wrapper for the DateRangePicker.
 * Arranges the dialog and optional time-window buttons in a horizontal row.
 */
export declare function DateRangePickerLayout({ children, className, 'data-test-subj': dataTestSubj, css: cssOverrides, }: DateRangePickerLayoutProps): React.JSX.Element;
export {};
