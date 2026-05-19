import React from 'react';
interface Props {
    links: {
        runtimePainless: string;
    };
    placeholder?: string;
    disabled?: boolean;
}
export declare const ScriptField: React.MemoExoticComponent<({ links, placeholder, disabled }: Props) => React.JSX.Element>;
export {};
