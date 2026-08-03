import type { FC } from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { DataGridDensity } from '@kbn/unified-data-table';
import type { ProfileProviderServices } from '../../profile_provider_services';
interface SparklineRendererProps {
    charts: ChartsPluginStart;
    values: unknown;
}
export declare const SparklineRenderer: FC<SparklineRendererProps>;
export declare const SparklineCellRenderer: FC<DataGridCellValueElementProps & {
    services: ProfileProviderServices;
    density: DataGridDensity | undefined;
}>;
export {};
