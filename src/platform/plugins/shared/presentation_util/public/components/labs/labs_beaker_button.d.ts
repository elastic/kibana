import React from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import type { Props as FlyoutProps } from './labs_flyout';
export type Props = EuiButtonProps & Pick<FlyoutProps, 'solutions'>;
export declare const LabsBeakerButton: ({ solutions, ...props }: Props) => React.JSX.Element;
export default LabsBeakerButton;
