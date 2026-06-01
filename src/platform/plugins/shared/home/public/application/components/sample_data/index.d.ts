import React from 'react';
interface Props {
    urlBasePath: string;
    onDecline: () => void;
    onConfirm: () => void;
}
export declare function SampleDataCard({ urlBasePath, onDecline, onConfirm }: Props): React.JSX.Element;
export {};
