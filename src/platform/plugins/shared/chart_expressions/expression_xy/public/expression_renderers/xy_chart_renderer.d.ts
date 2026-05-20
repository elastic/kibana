import type { PaletteRegistry } from '@kbn/coloring';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { ThemeServiceSetup } from '@kbn/core/public';
import type { getDataLayers } from '../helpers';
import type { XYChartProps } from '../../common';
import type { StartServices } from '../types';
export interface GetStartDeps {
    data: DataPublicPluginStart;
    formatFactory: FormatFactory;
    theme: ChartsPluginStart['theme'];
    kibanaTheme: ThemeServiceSetup;
    activeCursor: ChartsPluginStart['activeCursor'];
    paletteService: PaletteRegistry;
    timeZone: string;
    eventAnnotationService: EventAnnotationServiceType;
    usageCollection?: UsageCollectionStart;
    timeFormat: string;
    startServices: StartServices;
}
interface XyChartRendererDeps {
    getStartDeps: () => Promise<GetStartDeps>;
}
export declare const extractCounterEvents: (originatingApp: string, { annotations, layers, yAxisConfigs }: XYChartProps["args"], canNavigateToLens: boolean, services: {
    getDataLayers: typeof getDataLayers;
}) => string[] | undefined;
export declare const getXyChartRenderer: ({ getStartDeps, }: XyChartRendererDeps) => ExpressionRenderDefinition<XYChartProps>;
export {};
