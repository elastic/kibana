define(function (require) {
  return function VisTypeSchemasFactory(Private) {
    var _ = require('lodash');
    var IndexedArray = require('utils/indexed_array/index');
    var AggParams = Private(require('components/agg_types/_agg_params'));

    function Schemas(schemas) {
      var self = this;

      _(schemas || [])
        .map(function (schema) {
          if (!schema.name) throw new Error('all schema must have a unique name');

          if (schema.name === 'split') {
            schema.params = [
              {
                name: 'row',
                default: true
              }
            ];
            schema.editor = require('text!plugins/vis_types/controls/rows_or_columns.html');
          } else if (schema.name === 'radius') {
            schema.editor = require('text!plugins/vis_types/controls/radius_ratio_option.html');
          }

          _.defaults(schema, {
            min: 0,
            max: Infinity,
            group: 'buckets',
            title: schema.name,
            aggFilter: '*',
            editor: false,
            params: []
          });

          // convert the params into a params registry
          schema.params = new AggParams(schema.params);

          return schema;
        })
        .tap(function (schemas) {
          self.all = new IndexedArray({
            index: ['name'],
            group: ['group'],
            immutable: true,
            initialSet: schemas
          });
        })
        .groupBy('group')
        .forOwn(function (group, groupName) {
          self[groupName] = new IndexedArray({
            index: ['name'],
            immutable: true,
            initialSet: group
          });
        });
    }

    return Schemas;
  };
});
