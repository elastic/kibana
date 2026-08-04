import type { ChartProps, SettingsProps } from '@elastic/charts';
type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
} & {};
export type MakeOverridesSerializable<T> = {
    [KeyType in keyof T]: NonNullable<T[KeyType]> extends Function ? 'ignore' : NonNullable<T[KeyType]> extends React.ReactChildren | React.ReactElement ? never : NonNullable<T[KeyType]> extends object ? MakeOverridesSerializable<T[KeyType]> : NonNullable<T[KeyType]>;
};
export type AllowedChartOverrides = Partial<Record<'chart', Simplify<MakeOverridesSerializable<Pick<ChartProps, 'title' | 'description'>>>>>;
export type AllowedSettingsOverrides = Partial<Record<'settings', Simplify<MakeOverridesSerializable<Omit<SettingsProps, 'onRenderChange' | 'onPointerUpdate' | 'orderOrdinalBinsBy' | 'baseTheme' | 'legendColorPicker'>>>>>;
export {};
