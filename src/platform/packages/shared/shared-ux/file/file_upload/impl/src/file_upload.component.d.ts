import React from 'react';
import type { EuiFilePickerClass } from '@elastic/eui/src/components/form/file_picker/file_picker';
export interface Props {
    meta?: unknown;
    accept?: string;
    multiple?: boolean;
    fullWidth?: boolean;
    immediate?: boolean;
    allowClear?: boolean;
    compressed?: boolean;
    initialFilePromptText?: string;
    className?: string;
}
export declare const FileUpload: React.ForwardRefExoticComponent<Props & React.RefAttributes<EuiFilePickerClass>>;
