import type { InjectedIntl } from '@kbn/i18n-react';
import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
interface Props {
    value?: string | number;
    field: DataViewField;
    onChange: (value: string | number | boolean) => void;
    onBlur?: (value: string | number | boolean) => void;
    placeholder: string;
    intl: InjectedIntl;
    controlOnly?: boolean;
    className?: string;
    fullWidth?: boolean;
    isInvalid?: boolean;
    compressed?: boolean;
    disabled?: boolean;
    dataTestSubj?: string;
}
export declare const ValueInputType: React.FC<import("react-intl").WithIntlProps<Props>> & {
    WrappedComponent: React.ComponentType<Props>;
};
export {};
