import React from 'react';
import type { InstructionType } from '../../../services/tutorials/types';
export interface InstructionProps extends InstructionType {
    variantId: string;
    isCloudEnabled: boolean;
    replaceTemplateStrings: (text: string) => string;
}
export declare function Instruction({ commands, textPost, textPre, replaceTemplateStrings, customComponentName, variantId, isCloudEnabled, }: InstructionProps): React.JSX.Element;
