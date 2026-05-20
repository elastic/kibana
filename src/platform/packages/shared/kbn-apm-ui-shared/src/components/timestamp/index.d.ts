import React from 'react';
import type { EuiInlineEditTextSizes } from '@elastic/eui/src/components/inline_edit/inline_edit_text';
import type { TimeUnit } from '../../utils/formatters/datetime';
interface TimestampProps {
    timestamp: number;
    renderMode?: 'tooltip' | 'inline';
    timeUnit?: TimeUnit;
    size?: EuiInlineEditTextSizes;
}
export declare function Timestamp({ timestamp, renderMode, timeUnit, size, }: TimestampProps): React.JSX.Element;
export {};
