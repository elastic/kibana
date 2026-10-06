import React from 'react';
interface Props {
    urlBasePath: string;
    onDecline: () => void;
    onConfirm: () => void;
}
export declare function SampleDataCard({ onDecline, onConfirm }: Props): React.JSX.Element;
export {};
