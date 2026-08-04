import React from 'react';
import { type EuiTextProps } from '@elastic/eui';
/**
 * Converts a number into a string representation using SI prefixes for large and small numbers.
 * For example, 1500 becomes "1.5k" and 0.0000012 becomes "1.2μ".
 * Informed by https://gist.github.com/cho45/9968462?permalink_comment_id=3522694#gistcomment-3522694
 */
export declare const getSiPrefixedNumber: (number: number) => string;
interface NumberBadgeProps extends Pick<EuiTextProps, 'textAlign'> {
    value: number;
    /**
     * If provided, shortens the number at the given length and adds ellipsis.
     * For example, a value of 1000 with shortenAt=3 will display as "1K".
     */
    shortenAtExpSize: number;
}
/**
 * A badge component to display numbers in a consistent way.
 */
export declare function NumberBadge({ value, shortenAtExpSize, textAlign }: NumberBadgeProps): React.JSX.Element;
export {};
