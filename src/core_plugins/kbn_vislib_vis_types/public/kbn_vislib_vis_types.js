import visTypes from 'ui/registry/vis_types';

import histogramVisTypeProvider from 'plugins/kbn_vislib_vis_types/histogram';
import lineVisTypeProvider from 'plugins/kbn_vislib_vis_types/line';
import pieVisTypeProvider from 'plugins/kbn_vislib_vis_types/pie';
import areaVisTypeProvider from 'plugins/kbn_vislib_vis_types/area';
import tileMapVisTypeProvider from 'plugins/kbn_vislib_vis_types/tile_map';
import heatmapVisTypeProvider from 'plugins/kbn_vislib_vis_types/heatmap';
import horizontalBarVisTypeProvider from 'plugins/kbn_vislib_vis_types/horizontal_bar';

visTypes.register(histogramVisTypeProvider);
visTypes.register(lineVisTypeProvider);
visTypes.register(pieVisTypeProvider);
visTypes.register(areaVisTypeProvider);
visTypes.register(tileMapVisTypeProvider);
visTypes.register(heatmapVisTypeProvider);
visTypes.register(horizontalBarVisTypeProvider);
