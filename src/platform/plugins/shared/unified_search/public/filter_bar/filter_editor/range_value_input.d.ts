import type { InjectedIntl } from '@kbn/i18n-react';
import React from 'react';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { CoreStart } from '@kbn/core/public';
interface RangeParams {
    from: number | string;
    to: number | string;
}
type RangeParamsPartial = Partial<RangeParams>;
interface Props {
    field: DataViewField;
    value?: RangeParams;
    onChange: (params: RangeParamsPartial) => void;
    intl: InjectedIntl;
    fullWidth?: boolean;
    compressed?: boolean;
    disabled?: boolean;
}
export declare function isRangeParams(params: any): params is RangeParams;
export declare const formatDateChange: (value: string | number | boolean, kibana: KibanaReactContextValue<Partial<CoreStart>>) => string | number | boolean;
export declare const RangeValueInput: React.FC<import("react-intl").WithIntlProps<Props>> & {
    WrappedComponent: React.ComponentType<Props>;
};
export {};
