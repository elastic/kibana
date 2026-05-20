import type { FunctionComponent } from 'react';
interface Props {
    onCancel: () => void;
    onUpload: () => void;
    immediate?: boolean;
    compressed?: boolean;
}
export declare const ControlButton: FunctionComponent<Props>;
export {};
