import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { ChartSizeSpec } from '@kbn/chart-expressions-common';
import type { PersistedState } from '@kbn/visualizations-common';
import type { AlertRuleFromVisUIActionData } from '@kbn/alerts-ui-shared';
import type { FilterEvent, BrushEvent, FormatFactory, LayerCellValueActions, MultiFilterEvent } from '../types';
import type { XYChartProps } from '../../common/types';
declare global {
    interface Window {
        /**
         * Flag used to enable debugState on elastic charts
         */
        _echDebugStateFlag?: boolean;
    }
}
export type XYChartRenderProps = Omit<XYChartProps, 'canNavigateToLens'> & {
    chartsThemeService: ChartsPluginSetup['theme'];
    chartsActiveCursorService: ChartsPluginStart['activeCursor'];
    data: DataPublicPluginStart;
    paletteService: PaletteRegistry;
    formatFactory: FormatFactory;
    timeZone: string;
    minInterval: number | undefined;
    interactive?: boolean;
    onClickValue: (data: FilterEvent['data']) => void;
    onClickMultiValue: (data: MultiFilterEvent['data']) => void;
    onCreateAlertRule: (data: AlertRuleFromVisUIActionData) => void;
    layerCellValueActions: LayerCellValueActions;
    onSelectRange: (data: BrushEvent['data']) => void;
    renderMode: RenderMode;
    syncColors: boolean;
    syncTooltips: boolean;
    syncCursor: boolean;
    eventAnnotationService: EventAnnotationServiceType;
    renderComplete: () => void;
    uiState?: PersistedState;
    timeFormat: string;
    setChartSize: (chartSizeSpec: ChartSizeSpec) => void;
    shouldShowLegendAction?: (actionId: string) => boolean;
};
export declare const XYChartReportable: React.MemoExoticComponent<typeof XYChart>;
export declare function XYChart({ args, data, formatFactory, timeZone, chartsThemeService, chartsActiveCursorService, paletteService, minInterval, onClickValue, onClickMultiValue, onCreateAlertRule, layerCellValueActions, onSelectRange, setChartSize, interactive, syncColors, syncTooltips, syncCursor, renderComplete, uiState, timeFormat, overrides, }: XYChartRenderProps): React.JSX.Element;
