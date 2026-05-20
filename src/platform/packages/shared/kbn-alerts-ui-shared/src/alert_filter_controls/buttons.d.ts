import type { FC } from 'react';
import type { EuiButtonIconProps } from '@elastic/eui';
interface AddControlProps extends Partial<EuiButtonIconProps> {
    onClick: () => void;
}
export declare const AddControl: FC<AddControlProps>;
interface SaveControlsProps {
    onClick: () => void;
}
export declare const SaveControls: FC<SaveControlsProps>;
export {};
