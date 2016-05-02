import modules from 'ui/modules';
import template from './pattern_review_step.html';
import _ from 'lodash';
import editFieldTypeHTML from '../../partials/_edit_field_type.html';
import isGeoPointObject from './lib/is_geo_point_object';
import forEachField from './lib/for_each_field';
import './styles/_add_data_pattern_review_step.less';

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
        this.errors = [];
        if (_.isUndefined(this.indexPattern)) {
          this.indexPattern = {};
        }

        const knownFieldTypes = {};
        this.dateFields = [];
        if (this.pipeline) {
          this.pipeline.model.processors.forEach((processor) => {
            if (processor.typeId === 'date') {
              const field = processor.targetField || '@timestamp';
              knownFieldTypes[field] = 'date';
              this.dateFields.push(field);
            }
          });
        }

        const fields = {};
        forEachField(this.sampleDoc, (value, fieldName) => {
          let type = knownFieldTypes[fieldName] || typeof value;
          if (isGeoPointObject(value)) {
            type = 'geo_point';
            knownFieldTypes[fieldName] = 'geo_point';
          }

          if (!_.isUndefined(fields[fieldName]) && (fields[fieldName].type !== type)) {
            this.errors.push(`Error in field ${fieldName} - conflicting types '${fields[fieldName].type}' and '${type}'`);
          }
          else {
            fields[fieldName] = {type, value};
          }
        });

        const indexPatternFields = _(fields)
        .map((field, fieldName) => {
          return {name: fieldName, type: field.type};
        })
        .reject({type: 'object'})
        .value();

        _.defaults(this.indexPattern, {
          id: 'filebeat-*',
          title: 'filebeat-*',
          timeFieldName: pickDefaultTimeFieldName(this.dateFields),
          fields: indexPatternFields
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
            const sampleValue = fields[field.name].value;
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

