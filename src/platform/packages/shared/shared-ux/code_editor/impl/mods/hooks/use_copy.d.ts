import React from 'react';
export declare const useCopy: ({ isCopyable, value }: {
    isCopyable: boolean;
    value: string;
}) => {
    showCopyButton: string | false;
    CopyButton: () => React.JSX.Element | null;
};
