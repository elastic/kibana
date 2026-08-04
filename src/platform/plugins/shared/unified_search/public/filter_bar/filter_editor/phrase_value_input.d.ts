import type { InjectedIntl } from '@kbn/i18n-react';
import React from 'react';
import type { PhraseSuggestorProps } from './phrase_suggestor';
interface PhraseValueInputProps extends PhraseSuggestorProps {
    value?: string;
    onChange: (value: string | number | boolean) => void;
    onBlur?: (value: string | number | boolean) => void;
    intl: InjectedIntl;
    fullWidth?: boolean;
    compressed?: boolean;
    disabled?: boolean;
    invalid?: boolean;
}
export declare const PhraseValueInput: React.FC<import("react-intl").WithIntlProps<Omit<PhraseValueInputProps, "kibana">>> & {
    WrappedComponent: React.ComponentType<Omit<PhraseValueInputProps, "kibana">>;
};
export {};
