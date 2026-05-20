import React from 'react';
import type { CanAddNewPanel } from '@kbn/presentation-publishing';
export interface AddFromLibraryFormProps {
    container: CanAddNewPanel;
    modalTitleId?: string;
}
export interface AddFromLibraryContentProps {
    container: CanAddNewPanel;
}
export declare const AddFromLibraryContent: ({ container }: AddFromLibraryContentProps) => React.JSX.Element;
export declare const AddFromLibraryFlyout: ({ container, modalTitleId }: AddFromLibraryFormProps) => React.JSX.Element;
