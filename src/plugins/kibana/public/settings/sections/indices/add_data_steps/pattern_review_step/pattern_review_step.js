import modules from 'ui/modules';
import template from './pattern_review_step.html';
import _ from 'lodash';
import editFieldTypeHTML from '../../partials/_edit_field_type.html';
import keysDeep from '../pipeline_setup/lib/keys_deep';

function pickDefaultTimeFieldName(dateFields) {
  if (_.isEmpty(dateFields)) {
    return undefined;
  }

  return _.includes(dateFields, '@timestamp') ? '@timestamp' : dateFields[0];
}

function isGeoPointObject(object) {
  if(_.isPlainObject(object)) {
    const keys = _.keys(object);
    if (keys.length === 2 && _.contains(keys, 'lat') && _.contains(keys, 'lon')) {
      return true;
    }
  }
  else {
    return false;
  }
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
        const fields = keysDeep(this.sampleDoc);
        const geoPointFields = _.filter(fields, key => isGeoPointObject(_.get(this.sampleDoc, key)));
        const indexPatternFields = _(fields)
        .reject((field) => {
          let shouldReject = false;
          geoPointFields.forEach((geoPointField) => {
            if (field === `${geoPointField}.lat` || field === `${geoPointField}.lon`) {
              shouldReject = true;
            }
          });
          return shouldReject;
        })
        .reject((field) => {
          const value = _.get(this.sampleDoc, field);
          return _.isPlainObject(value) && !isGeoPointObject(value);
        })
        .value();

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
        geoPointFields.forEach(fieldName => knownFieldTypes[fieldName] = 'geo_point');

        _.defaults(this.indexPattern, {
          id: 'filebeat-*',
          title: 'filebeat-*',
          timeFieldName: pickDefaultTimeFieldName(this.dateFields),
          fields: _.map(indexPatternFields, (fieldName) => {
            const fieldValue = _.get(this.sampleDoc, fieldName);
            let type = knownFieldTypes[fieldName] || typeof fieldValue;
            if (type === 'object' && _.isArray(fieldValue) && !_.isEmpty(fieldValue)) {
              type = typeof fieldValue[0];
            }
            return {name: fieldName, type: type};
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
            const sampleValue = _.get(this.sampleDoc, field.name);
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

