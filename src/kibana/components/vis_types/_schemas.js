define(function (require) {
  return function VisTypeSchemasFactory() {
    var _ = require('lodash');
    var Registry = require('utils/registry');

    function Schemas(schemas) {
      var self = this;

      _(schemas || [])
        .map(function (schema) {
          if (!schema.name) throw new Error('all schema must have a unique name');

          _.defaults(schema, {
            min: 0,
            max: Infinity,
            group: 'buckets',
            title: schema.name
          });

          if (schema.name === 'split') {
            schema.params = {
              row: true
            };
            schema.editor = require('text!components/vis_types/controls/rows_or_columns.html');
          }

          return schema;
        })
        .tap(function (schemas) {
          self.all = new Registry({
            index: ['name'],
            group: ['group'],
            immutable: true,
            initialSet: schemas
          });
        })
        .groupBy('group')
        .forOwn(function (group, groupName) {
          self[groupName] = new Registry({
            index: ['name'],
            immutable: true,
            initialSet: group
          });
        });
    }

    return Schemas;
  };
});