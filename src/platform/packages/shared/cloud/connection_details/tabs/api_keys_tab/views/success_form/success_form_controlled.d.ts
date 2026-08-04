import * as React from 'react';
import type { ApiKey } from './types';
import { type Format } from './format_select';
export interface SuccessFormControlledProps {
    apiKey: ApiKey;
    format: Format;
    onFormatChange: (format: Format) => void;
    onCopyClick?: () => void;
}
export declare const SuccessFormControlled: React.FC<SuccessFormControlledProps>;
