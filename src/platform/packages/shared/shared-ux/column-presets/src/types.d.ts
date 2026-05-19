import type { EuiBasicTableColumn } from '@elastic/eui';
export type ColumnPreset<TArgs extends object = {}, TDataShapeSrc extends object = object> = <TDataShape extends object = TDataShapeSrc>(...args: keyof TArgs extends never ? [] : [args: TArgs]) => Partial<EuiBasicTableColumn<TDataShape>>;
