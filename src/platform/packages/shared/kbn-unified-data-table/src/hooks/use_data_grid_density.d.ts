import type { EuiDataGridStyle } from '@elastic/eui';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { DataGridDensity } from '../constants';
export declare const DATA_GRID_DENSITY_STYLE_MAP: {
    compact: EuiDataGridStyle;
    normal: EuiDataGridStyle;
    expanded: EuiDataGridStyle;
};
interface UseDataGridDensityProps {
    storage: Storage;
    consumer: string;
    dataGridDensityState?: DataGridDensity;
    onUpdateDataGridDensity?: (density: DataGridDensity) => void;
}
export declare function getDensityFromStyle(style: EuiDataGridStyle): DataGridDensity;
export declare const getDataGridDensity: (storage: Storage, consumer: string) => DataGridDensity;
export declare const useDataGridDensity: ({ storage, consumer, dataGridDensityState, onUpdateDataGridDensity, }: UseDataGridDensityProps) => {
    dataGridDensity: DataGridDensity;
    onChangeDataGridDensity: (gridStyle: EuiDataGridStyle) => void;
};
export {};
