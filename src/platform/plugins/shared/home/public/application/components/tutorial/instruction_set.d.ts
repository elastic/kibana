import React from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
import * as StatusCheckStates from './status_check_states';
import type { InstructionSetType } from '../../../services/tutorials/types';
interface InstructionSetProps extends InstructionSetType {
    instructionVariants: InstructionSetType['instructionVariants'];
    statusCheckConfig: InstructionSetType['statusCheck'];
    statusCheckState: keyof typeof StatusCheckStates;
    onStatusCheck: () => void;
    offset: number;
    replaceTemplateStrings: (text: string) => string;
    isCloudEnabled: boolean;
    intl: InjectedIntl;
}
export declare const InstructionSet: React.FC<import("react-intl").WithIntlProps<InstructionSetProps>> & {
    WrappedComponent: React.ComponentType<InstructionSetProps>;
};
export {};
