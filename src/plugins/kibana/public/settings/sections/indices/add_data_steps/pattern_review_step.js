const modules = require('ui/modules');
const template = require('plugins/kibana/settings/sections/indices/add_data_steps/pattern_review_step.html');
const _ = require('lodash');
const editFieldTypeHTML = require('plugins/kibana/settings/sections/indices/partials/_edit_field_type.html');

const testData = {
  message: '11/24/2015 ip=1.1.1.1 bytes=1234',
  clientip: '1.1.1.1',
  bytes: 1234,
  geoip: {
    lat: 37.3894,
    lon: 122.0819
  },
  location: {
    lat: 37.3894,
    lon: 122.0819
  },
  '@timestamp': '2015-11-24T00:00:00.000Z',
  otherdate: '2015-11-24T00:00:00.000Z',
  codes: [1, 2, 3, 4]
};

const testPipeline = [
  {
    grok: {
      match_field: 'message',
      match_pattern: 'foo'
    }
  },
  {
    geoip: {
      source_field: 'ip'
    }
  },
  {
    geoip: {
      source_field: 'ip',
      target_field: 'location'
    }
  },
  {
    date: {
      match_field: 'initialDate',
      match_formats: ['dd/MM/yyyy hh:mm:ss']
    }
  },
  {
    date: {
      match_field: 'initialDate',
      match_formats: ['dd/MM/yyyy hh:mm:ss'],
      target_field: 'otherdate'
    }
  }
];

function pickDefaultTimeFieldName(dateFields) {
  if (_.isEmpty(dateFields)) {
    return undefined;
  }

  let fieldName = dateFields[0];
  if (_.includes(dateFields, '@timestamp')) {
    fieldName = '@timestamp';
  }

  return fieldName;
}

modules.get('apps/settings')
  .directive('patternReviewStep', function () {
    return {
      template: template,
      scope: {
        sampleDocs: '=',
        indexPattern: '=',
        pipeline: '='
      },
      controllerAs: 'reviewStep',
      bindToController: true,
      controller: function ($scope, Private) {
        this.sampleDocs = testData;
        this.pipeline = testPipeline;

        if (_.isUndefined(this.indexPattern)) {
          this.indexPattern = {};
        }

        const knownFieldTypes = {};
        this.dateFields = [];
        this.pipeline.forEach((processor) => {
          if (processor.geoip) {
            let field = processor.geoip.target_field || 'geoip';
            knownFieldTypes[field] = 'geo_point';
          }
          if (processor.date) {
            let field = processor.date.target_field || '@timestamp';
            knownFieldTypes[field] = 'date';
            this.dateFields.push(field);
          }
        });

        _.defaults(this.indexPattern, {
          id: 'filebeat-*',
          title: 'filebeat-*',
          timeFieldName: pickDefaultTimeFieldName(this.dateFields),
          fields: _.map(this.sampleDocs, (value, key) => {
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

        this.columns = [
          {title: 'Field'},
          {title: 'Type'},
          {title: 'Example', sortable: false}
        ];

        this.rows = _.map(this.indexPattern.fields, (field) => {
          const sampleValue = this.sampleDocs[field.name];
          return [
            field.name,
            {
              markup: editFieldTypeHTML,
              scope: _.assign($scope.$new(), {field: field, knownFieldTypes: knownFieldTypes})
            },
            typeof sampleValue === 'object' ? JSON.stringify(sampleValue) : sampleValue
          ];
        });
      }
    };
  });

