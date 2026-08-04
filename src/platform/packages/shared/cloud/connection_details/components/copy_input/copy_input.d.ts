import * as React from 'react';
export interface CopyInputProps {
    value: string;
    onCopyClick?: React.MouseEventHandler<HTMLAnchorElement>;
    onCopySuccess?: () => void;
    screenReaderHint?: string;
}
export declare const CopyInput: React.FC<CopyInputProps>;
