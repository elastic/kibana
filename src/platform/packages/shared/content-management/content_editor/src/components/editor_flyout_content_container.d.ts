import type { FC } from 'react';
import type { Props as ContentEditorFlyoutContentProps } from './editor_flyout_content';
type CommonProps = Pick<ContentEditorFlyoutContentProps, 'item' | 'isReadonly' | 'readonlyReason' | 'services' | 'onSave' | 'entityName' | 'customValidators' | 'appendRows'>;
export type Props = CommonProps;
export declare const ContentEditorFlyoutContentContainer: FC<Props>;
export {};
