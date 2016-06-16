import modules from 'ui/modules';
import template from './pattern_review_step.html';
import _ from 'lodash';
import editFieldTypeHTML from '../../partials/_edit_field_type.html';
import isGeoPointObject from './lib/is_geo_point_object';
import forEachField from './lib/for_each_field';
import './styles/_add_data_pattern_review_step.less';
import moment from 'moment';
import '../../../../../../../../ui/public/directives/validate_lowercase';

function pickDefaultTimeFieldName(dateFields) {
  if (_.isEmpty(dateFields)) {
    return undefined;
  }

  return _.includes(dateFields, '@timestamp') ? '@timestamp' : dateFields[0];
}

function findFieldsByType(indexPatternFields, type) {
  return _.map(_.filter(indexPatternFields, {type}), 'name');
}

modules.get('apps/management')
  .directive('patternReviewStep', function () {
    return {
      template: template,
      scope: {
        indexPattern: '=',
        pipeline: '=',
        sampleDoc: '=',
        defaultIndexInput: '='
      },
      controllerAs: 'reviewStep',
      bindToController: true,
      controller: function ($scope, Private) {
        this.errors = [];
        const sampleFields = {};

        this.patternInput = {
          label: 'Index name',
          helpText: 'The name of the Elasticsearch index you want to create for your data.',
          defaultValue: '',
          placeholder: 'Name'
        };

        if (this.defaultIndexInput) {
          this.patternInput.defaultValue = this.defaultIndexInput;
        }

        if (_.isUndefined(this.indexPattern)) {
          this.indexPattern = {};
        }

        forEachField(this.sampleDoc, (value, fieldName) => {
          let type = typeof value;

          if (isGeoPointObject(value)) {
            type = 'geo_point';
          }

          if (type === 'string' && moment(value, moment.ISO_8601).isValid()) {
            type = 'date';
          }

          if (value === null) {
            type = 'string';
          }

          if (!_.isUndefined(sampleFields[fieldName]) && (sampleFields[fieldName].type !== type)) {
            this.errors.push(`Error in field ${fieldName} - conflicting types '${sampleFields[fieldName].type}' and '${type}'`);
          }
          else {
            sampleFields[fieldName] = {type, value};
          }
        });

        _.defaults(this.indexPattern, {
          id: this.patternInput.defaultValue,
          title: 'filebeat-*',
          fields: _(sampleFields)
            .map((field, fieldName) => {
              return {name: fieldName, type: field.type};
            })
            .reject({type: 'object'})
            .value()
        });

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
          this.dateFields = findFieldsByType(fields, 'date');
        }, true);


        this.dateFields = findFieldsByType(this.indexPattern.fields, 'date');
        this.isTimeBased = !_.isEmpty(this.dateFields);

        const buildRows = () => {
          this.rows = _.map(this.indexPattern.fields, (field) => {
            const {type: detectedType, value: sampleValue} = sampleFields[field.name];
            return [
              _.escape(field.name),
              {
                markup: editFieldTypeHTML,
                scope: _.assign($scope.$new(), {field: field, detectedType: detectedType, buildRows: buildRows}),
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

