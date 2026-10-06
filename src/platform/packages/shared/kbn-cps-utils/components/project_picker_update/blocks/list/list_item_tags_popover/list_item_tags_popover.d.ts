import React from 'react';
import type { EuiWrappingPopoverProps } from '@elastic/eui';
import type { getProjectTags } from '../../../../utils';
interface ProjectPickerListItemTagsPopoverProps extends Pick<EuiWrappingPopoverProps, 'button'> {
    isOpen: boolean;
    closeHandler: () => void;
    projectTags: ReturnType<typeof getProjectTags>;
}
export declare function ProjectPickerListItemTagsPopover({ button, closeHandler, isOpen, projectTags, }: ProjectPickerListItemTagsPopoverProps): React.JSX.Element;
export {};
