import React from 'react';
import type { CanAddNewPanel } from '@kbn/presentation-publishing';
export interface AddFromLibraryFormProps {
    container: CanAddNewPanel;
    modalTitleId?: string;
}
export declare const AddFromLibraryFlyout: ({ container, modalTitleId }: AddFromLibraryFormProps) => React.JSX.Element;
