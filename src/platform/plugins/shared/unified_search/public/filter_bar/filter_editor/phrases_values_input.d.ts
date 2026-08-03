import type { InjectedIntl } from '@kbn/i18n-react';
import React from 'react';
import type { WithEuiThemeProps } from '@elastic/eui';
import type { PhraseSuggestorProps } from './phrase_suggestor';
interface Props {
    values?: string[];
    onChange: (values: string[]) => void;
    onParamsUpdate: (value: string) => void;
    intl: InjectedIntl;
    fullWidth?: boolean;
    compressed?: boolean;
    disabled?: boolean;
}
export type PhrasesValuesInputProps = Props & PhraseSuggestorProps & WithEuiThemeProps;
export declare const PhrasesValuesInput: React.FC<import("react-intl").WithIntlProps<Omit<Omit<PhrasesValuesInputProps, "kibana">, "theme"> & React.RefAttributes<Omit<Omit<PhrasesValuesInputProps, "kibana">, "theme">>>> & {
    WrappedComponent: React.ComponentType<Omit<Omit<PhrasesValuesInputProps, "kibana">, "theme"> & React.RefAttributes<Omit<Omit<PhrasesValuesInputProps, "kibana">, "theme">>>;
};
export {};
