import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import { CATEGORY } from 'ui/vis/vis_category';
import pieTemplate from 'plugins/kbn_vislib_vis_types/editors/pie.html';
import image from './images/icon-pie.svg';
import { AggTypesIndexProvider } from 'ui/agg_types';
import { AggregationsProvider } from 'ui/vis/aggregations';

export default function HistogramVisType(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);
  const AggTypes = Private(AggTypesIndexProvider);
  const AGGREGATIONS = Private(AggregationsProvider);

  return VisFactory.createVislibVisualization({
    name: 'pie',
    title: 'Pie',
    image,
    description: 'Compare parts of a whole',
    category: CATEGORY.BASIC,
    visConfig: {
      defaults: {
        type: 'pie',
        addTooltip: true,
        addLegend: true,
        legendPosition: 'right',
        isDonut: false
      },
    },
    editorConfig: {
      collections: {
        legendPositions: [{
          value: 'left',
          text: 'left',
        }, {
          value: 'right',
          text: 'right',
        }, {
          value: 'top',
          text: 'top',
        }, {
          value: 'bottom',
          text: 'bottom',
        }],
      },
      optionsTemplate: pieTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Slice Size',
          min: 1,
          max: 1,
          aggFilter: [
            AggTypes.byName.count.name,
            AggTypes.byName.sum.name,
            AggTypes.byName.cardinality.name,
            AggTypes.byName.top_hits.name
          ],
          defaults: [
            { schema: 'metric', type: AggTypes.byName.count.name }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          icon: 'fa fa-scissors',
          title: 'Split Slices',
          min: 0,
          max: Infinity,
          aggFilter: AGGREGATIONS.DEFAULT_BUCKETS
        },
        {
          group: 'buckets',
          name: 'split',
          icon: 'fa fa-th',
          title: 'Split Chart',
          mustBeFirst: true,
          min: 0,
          max: 1,
          aggFilter: AGGREGATIONS.DEFAULT_BUCKETS
        }
      ])
    },
    hierarchicalData: true,
    implementsRenderComplete: true
  });
}
