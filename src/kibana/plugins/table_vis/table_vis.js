define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/table_vis/table_vis.css');

  // require the directives that we use as well
  require('components/agg_table/agg_table');
  require('components/agg_table/agg_table_group');

  // define the TableVisType
  return function TableVisTypeProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));
    var NotEnoughData = require('errors').NotEnoughData;
    var Schemas = Private(require('plugins/vis_types/_schemas'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'table',
      title: 'Data Table',
      icon: 'fa-table',
      template: require('text!plugins/table_vis/table_vis.html'),

      // parameter definition allows users to modify variable inside the vis
      params: {
        defaults: {
          perPage: 10
        },
        // template that can edit these params
        editor: require('text!plugins/table_vis/table_vis_config.html')
      },

      // agg schemas that the user can config to create the request this vis will display
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          min: 1,
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        },
        {
          group: 'buckets',
          name: 'bucket',
          title: 'Split Rows'
        },
        {
          group: 'buckets',
          name: 'split',
          title: 'Split Table'
        }
      ]),

      /**
       * function to run after receiving a response from elasticsearch, which can
       * manipulate the templates $scope to include a transformed esResp, or throw
       * one of a couple common errors to have it shown to the user
       *
       * @injected
       * @param  {$scope} $scope - the scope that the template was rendered into
       * @param  {object} esResp - the response from elasticsearch
       * @param  {Vis} vis - the Vis instance that is of type TableVisType
       * @throws {NotEnoughData} If the hits are empty, or none of the tables have rows
       * @return {undefined}
       */
      onEsResp: function ($scope, esResp, vis) {
        $scope.tableGroups = $scope.visError = null; // reset

        if (!esResp) return;

        if (esResp.hits.total === 0) {
          throw new NotEnoughData();
        }

        var tableGroups = tabifyAggResponse(vis, esResp);
        var hasSomeRows = tableGroups.tables.some(function haveRows(table) {
          if (table.tables) return table.tables.some(haveRows);
          return table.rows.length > 1;
        });

        if (!hasSomeRows) {
          throw new NotEnoughData();
        }

        $scope.tableGroups = tableGroups;
      }
    });
  };
});