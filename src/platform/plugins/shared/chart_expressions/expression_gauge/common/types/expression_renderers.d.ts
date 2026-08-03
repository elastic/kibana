import type { PaletteRegistry } from '@kbn/coloring';
import type { PersistedState } from '@kbn/visualizations-common';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { AllowedSettingsOverrides, AllowedChartOverrides } from '@kbn/charts-plugin/common';
import type { ChartSizeSpec } from '@kbn/chart-expressions-common';
import type { AllowedGaugeOverrides, GaugeExpressionProps } from './expression_functions';
export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;
export type GaugeRenderProps = GaugeExpressionProps & {
    formatFactory: FormatFactory;
    chartsThemeService: ChartsPluginSetup['theme'];
    paletteService: PaletteRegistry;
    renderComplete: () => void;
    uiState: PersistedState;
    overrides?: AllowedGaugeOverrides & AllowedSettingsOverrides & AllowedChartOverrides;
    setChartSize: (d: ChartSizeSpec) => void;
};
