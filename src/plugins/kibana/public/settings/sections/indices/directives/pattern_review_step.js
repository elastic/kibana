var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/directives/pattern_review_step.html');
var _ = require('lodash');
var editFieldTypeHTML = require('plugins/kibana/settings/sections/indices/partials/_edit_field_type.html');

var testData = {
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

var testPipeline = [
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
      controller: function ($scope, Private) {
        $scope.sampleDocs = testData;
        $scope.pipeline = testPipeline;

        if (_.isUndefined($scope.indexPattern)) {
          $scope.indexPattern = {};
        }

        const knownFieldTypes = {};
        $scope.dateFields = [];
        $scope.pipeline.forEach(function (processor) {
          if (processor.geoip) {
            let field = processor.geoip.target_field || 'geoip';
            knownFieldTypes[field] = 'geo_point';
          }
          if (processor.date) {
            let field = processor.date.target_field || '@timestamp';
            knownFieldTypes[field] = 'date';
            $scope.dateFields.push(field);
          }
        });

        _.defaults($scope.indexPattern, {
          id: 'filebeat-*',
          title: 'filebeat-*',
          timeFieldName: pickDefaultTimeFieldName($scope.dateFields),
          fields: _.map($scope.sampleDocs, (value, key) => {
            let type = knownFieldTypes[key] || typeof value;
            if (type === 'object' && _.isArray(value) && !_.isEmpty(value)) {
              type = typeof value[0];
            }
            return {name: key, type: type};
          })
        });

        $scope.isTimeBased = !!$scope.indexPattern.timeFieldName;

        $scope.$watch('indexPattern.id', function (value) {
          $scope.indexPattern.title = value;
        });
        $scope.$watch('isTimeBased', function (value) {
          if (value) {
            $scope.indexPattern.timeFieldName = pickDefaultTimeFieldName($scope.dateFields);
          }
          else {
            delete $scope.indexPattern.timeFieldName;
          }
        });
        $scope.$watch('indexPattern.fields', (fields) => {
          $scope.dateFields = _.map(_.filter(fields, {type: 'date'}), 'name');
        }, true);

        $scope.columns = [
          {title: 'Field'},
          {title: 'Type'},
          {title: 'Example', sortable: false}
        ];

        $scope.rows = _.map($scope.indexPattern.fields, (field) => {
          const sampleValue = $scope.sampleDocs[field.name];
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

