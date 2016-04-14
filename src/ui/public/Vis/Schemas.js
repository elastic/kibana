define(function (require) {
  return function VisTypeSchemasFactory(Private) {
    let _ = require('lodash');
    let IndexedArray = require('ui/IndexedArray');
    let AggParams = Private(require('ui/agg_types/AggParams'));

    function Schemas(schemas) {
      let self = this;

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
          schema.editor = require('plugins/kbn_vislib_vis_types/controls/rows_or_columns.html');
        } else if (schema.name === 'radius') {
          schema.editor = require('plugins/kbn_vislib_vis_types/controls/radius_ratio_option.html');
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
      })
      .commit();
    }

    return Schemas;
  };
});
