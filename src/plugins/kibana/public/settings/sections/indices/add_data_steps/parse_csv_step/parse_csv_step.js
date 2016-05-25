import _ from 'lodash';
import Papa from 'papaparse';
import modules from 'ui/modules';
import template from './parse_csv_step.html';
import './styles/_add_data_parse_csv_step.less';

modules.get('apps/settings')
  .directive('parseCsvStep', function () {
    return {
      restrict: 'E',
      template: template,
      scope: {
        file: '=',
        parseOptions: '=',
        samples: '='
      },
      bindToController: true,
      controllerAs: 'wizard',
      controller: function ($scope) {

        this.delimiterOptions = [
          {
            label: 'comma',
            value: ','
          },
          {
            label: 'tab',
            value: '\t'
          },
          {
            label: 'space',
            value: ' '
          },
          {
            label: 'semicolon',
            value: ';'
          },
          {
            label: 'pipe',
            value: '|'
          }
        ];

        this.parse = () => {
          if (!this.file) return;

          const config = _.assign(
            {
              header: true,
              preview: 10,
              dynamicTyping: true,
              complete: (results) => {
                $scope.$apply(() => {
                  this.formattedErrors = _.map(results.errors, (error) => {
                    return `${error.type} at row ${error.row + 1} - ${error.message}`;
                  });
                  _.forEach(results.meta.fields, (field) => {
                    if (_.isEmpty(field)) {
                      this.formattedErrors.push('Column names must not be blank');
                    }
                  });

                  this.columns = results.meta.fields;
                  this.rows = _.map(results.data, (row) => {
                    return _.map(this.columns, (columnName) => {
                      return row[columnName];
                    });
                  });

                  if (_.isUndefined(this.formattedErrors) || _.isEmpty(this.formattedErrors)) {
                    this.samples = results.data;
                  }
                  else {
                    delete this.samples;
                  }
                  this.parseOptions = _.defaults({}, this.parseOptions, {delimiter: results.meta.delimiter});
                });
              }
            },
            this.parseOptions
          );

          Papa.parse(this.file, config);
        };

        $scope.$watch('wizard.parseOptions', this.parse, true);
        $scope.$watch('wizard.file', () => {
          delete this.formattedErrors;
          this.parse();
        });

        this.parse();
      }
    };
  });
