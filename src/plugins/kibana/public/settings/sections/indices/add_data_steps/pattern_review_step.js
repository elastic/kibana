import modules from 'ui/modules';
import template from 'plugins/kibana/settings/sections/indices/add_data_steps/pattern_review_step.html';
import _ from 'lodash';
import editFieldTypeHTML from 'plugins/kibana/settings/sections/indices/partials/_edit_field_type.html';

function pickDefaultTimeFieldName(dateFields) {
  if (_.isEmpty(dateFields)) {
    return undefined;
  }

  return _.includes(dateFields, '@timestamp') ? '@timestamp' : dateFields[0];
}

modules.get('apps/settings')
  .directive('patternReviewStep', function () {
    return {
      template: template,
      scope: {
        indexPattern: '=',
        pipeline: '=',
        sampleDoc: '='
      },
      controllerAs: 'reviewStep',
      bindToController: true,
      controller: function ($scope, Private) {
        if (_.isUndefined(this.indexPattern)) {
          this.indexPattern = {};
        }

        const knownFieldTypes = {};
        this.dateFields = [];
        this.pipeline.model.processors.forEach((processor) => {
          if (processor.typeId === 'geoip') {
            const field = processor.targetField || 'geoip';
            knownFieldTypes[field] = 'geo_point';
          }
          else if (processor.typeId === 'date') {
            const field = processor.targetField || '@timestamp';
            knownFieldTypes[field] = 'date';
            this.dateFields.push(field);
          }
        });

        _.defaults(this.indexPattern, {
          id: 'filebeat-*',
          title: 'filebeat-*',
          timeFieldName: pickDefaultTimeFieldName(this.dateFields),
          fields: _.map(this.sampleDoc, (value, key) => {
            let type = knownFieldTypes[key] || typeof value;
            if (type === 'object' && _.isArray(value) && !_.isEmpty(value)) {
              type = typeof value[0];
            }
            return {name: key, type: type};
          })
        });

        this.isTimeBased = !!this.indexPattern.timeFieldName;

        $scope.$watch('reviewStep.indexPattern.id', (value) => {
          this.indexPattern.title = value;
        });
        $scope.$watch('reviewStep.isTimeBased', (value) => {
          if (value) {
            this.indexPattern.timeFieldName = pickDefaultTimeFieldName(this.dateFields);
          }
          else {
            delete this.indexPattern.timeFieldName;
          }
        });
        $scope.$watch('reviewStep.indexPattern.fields', (fields) => {
          this.dateFields = _.map(_.filter(fields, {type: 'date'}), 'name');
        }, true);

        const buildRows = () => {
          this.rows = _.map(this.indexPattern.fields, (field) => {
            const sampleValue = this.sampleDoc[field.name];
            return [
              _.escape(field.name),
              {
                markup: editFieldTypeHTML,
                scope: _.assign($scope.$new(), {field: field, knownFieldTypes: knownFieldTypes, buildRows: buildRows}),
                value: field.type
              },
              typeof sampleValue === 'object' ? _.escape(JSON.stringify(sampleValue)) : _.escape(sampleValue)
            ];
          });
        };

        this.columns = [
          {title: 'Field'},
          {title: 'Type'},
          {title: 'Example', sortable: false}
        ];

        buildRows();
      }
    };
  });

