import "plugins/network_vis/network_vis.less";

import { KbnNetworkVisController } from './network_vis_controller'
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import image from './images/icon-network.svg';
import networkVisTemplate from 'plugins/network_vis/network_vis.html';
import networkVisParamsTemplate from 'plugins/network_vis/network_vis_params.html';




// register the provider with the visTypes registry
VisTypesRegistryProvider.register(NetworkVisTypeProvider);

// define the TableVisType
function NetworkVisTypeProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return VisFactory.createAngularVisualization({
    name: 'network',
    title: 'Network',
    image,
    description: 'Displays a network node that link two fields that have been selected.',
    visConfig: {
      defaults: {
        showLabels: true,
        showPopup: false,
        showColorLegend: true,
        nodePhysics: true,
        firstNodeColor: '#FD7BC4',
        secondNodeColor: '#00d1ff',
        canvasBackgroundColor: '#FFFFFF',
        shapeFirstNode: 'dot',
        shapeSecondNode: 'box',
        displayArrow: false,
        posArrow: 'to',
        shapeArrow: 'arrow',
        smoothType: 'continuous',
        scaleArrow: 1,
        maxCutMetricSizeNode: 5000,
        maxCutMetricSizeEdge: 5000,
        minCutMetricSizeNode: 0,
        maxNodeSize: 80,
        minNodeSize: 8,
        maxEdgeSize: 20,
        minEdgeSize: 0.1,
        springConstant: 0.001,
        gravitationalConstant: -35000,
        labelColor: '#000000'
      },
      template: networkVisTemplate,
    },
    editorConfig: {
      optionsTemplate: networkVisParamsTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'size_node',
          title: 'Node Size',
          mustBeFirst: 'true',
          min: 1,
          max: 1,
          defaults: [
            { type: 'count', schema: 'size_node' }
          ]
          
          //aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'std_dev']
        },
        {
          group: 'metrics',
          name: 'size_edge',
          title: 'Edge Size',
          max: 1,
        },
        {
          group: 'buckets',
          name: 'first',
          icon: 'fa fa-circle-thin',
          mustBeFirst: 'true',
          title: 'Node',
          min: 1,
          max: 2,
          aggFilter: ['terms']//Only have sense choose terms
        },
        {
          group: 'buckets',
          name: 'second',
          icon: 'fa fa-random',
          title: 'Relation',
          max: 1,
          aggFilter: ['terms']
        },
        {
          group: 'buckets',
          name: 'colornode',
          icon: 'fa fa-paint-brush',
          title: 'Node Color',
          max: 1,
          aggFilter: ['terms']
        }
      ])
    },
    responseHandlerConfig: {
      asAggConfigResults: true
    },
    ////////MIRAR THIS
    hierarchicalData: function (vis) {
      return true;
    },
    ////////////////////


  });
}

export default NetworkVisTypeProvider;
