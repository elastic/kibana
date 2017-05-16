import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import histogramVisTypeProvider from 'plugins/kbn_vislib_vis_types/histogram';
import lineVisTypeProvider from 'plugins/kbn_vislib_vis_types/line';
import pieVisTypeProvider from 'plugins/kbn_vislib_vis_types/pie';
import areaVisTypeProvider from 'plugins/kbn_vislib_vis_types/area';
import heatmapVisTypeProvider from 'plugins/kbn_vislib_vis_types/heatmap';
import horizontalBarVisTypeProvider from 'plugins/kbn_vislib_vis_types/horizontal_bar';

VisTypesRegistryProvider.register(histogramVisTypeProvider);
VisTypesRegistryProvider.register(lineVisTypeProvider);
VisTypesRegistryProvider.register(pieVisTypeProvider);
VisTypesRegistryProvider.register(areaVisTypeProvider);
VisTypesRegistryProvider.register(heatmapVisTypeProvider);
VisTypesRegistryProvider.register(horizontalBarVisTypeProvider);
