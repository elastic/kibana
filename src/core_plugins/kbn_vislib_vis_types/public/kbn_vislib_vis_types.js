import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import histogramVisTypeProvider from './histogram';
import lineVisTypeProvider from './line';
import pieVisTypeProvider from './pie';
import areaVisTypeProvider from './area';
import heatmapVisTypeProvider from './heatmap';
import horizontalBarVisTypeProvider from './horizontal_bar';
import gaugeVisTypeProvider from './gauge';
import goalVisTypeProvider from './goal';

VisTypesRegistryProvider.register(histogramVisTypeProvider);
VisTypesRegistryProvider.register(lineVisTypeProvider);
VisTypesRegistryProvider.register(pieVisTypeProvider);
VisTypesRegistryProvider.register(areaVisTypeProvider);
VisTypesRegistryProvider.register(heatmapVisTypeProvider);
VisTypesRegistryProvider.register(horizontalBarVisTypeProvider);
VisTypesRegistryProvider.register(gaugeVisTypeProvider);
VisTypesRegistryProvider.register(goalVisTypeProvider);
