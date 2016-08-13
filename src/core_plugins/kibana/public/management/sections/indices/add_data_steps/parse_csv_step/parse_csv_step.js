import _ from 'lodash';
import Papa from 'papaparse';
import modules from 'ui/modules';
import template from './parse_csv_step.html';
import './styles/_add_data_parse_csv_step.less';

modules.get('apps/management')
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
      controller: function ($scope, debounce) {
        const maxSampleRows = 10;
        const maxSampleColumns = 20;

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

        this.parse = debounce(() => {
          if (!this.file) return;
          let row = 1;
          let rows = [];
          let data = [];

          delete this.rows;
          delete this.columns;
          this.formattedErrors = [];
          this.formattedWarnings = [];

          const config = _.assign(
            {
              header: true,
              dynamicTyping: true,
              step: (results, parser) => {
                if (row > maxSampleRows) {
                  parser.abort();

                  // The complete callback isn't automatically called if parsing is manually aborted
                  config.complete();
                  return;
                }
                if (row === 1) {
                  // Convert column names with spaces in them to camel case
                  const columnNames = results.meta.fields.map((column) => {
                    return /\s/g.test(column) ? _.camelCase(column) : column;
                  });

                  // Collect general information on the first pass
                  if (columnNames.length > _.uniq(columnNames).length) {
                    let errorMsg = 'Column names must be unique';
                    if (results.meta.fields.length === _.unique(results.meta.fields).length) {
                      // If the original names (not the camel cased ones) would have been unique
                      // add a hin about the camel casing to the error.
                      errorMsg += ' (be aware that column names with spaces were converted to camel case)';
                    }
                    this.formattedErrors.push(errorMsg);
                  }

                  let hasEmptyHeader = false;
                  _.forEach(columnNames, (field) => {
                    if (_.isEmpty(field)) {
                      hasEmptyHeader = true;
                    }
                  });
                  if (hasEmptyHeader) {
                    this.formattedErrors.push('Column names must not be blank');
                  }

                  if (columnNames.length > maxSampleColumns) {
                    this.formattedWarnings.push(`Preview truncated to ${maxSampleColumns} columns`);
                  }

                  this.columns = columnNames.slice(0, maxSampleColumns);
                  this.parseOptions = _.defaults({}, this.parseOptions, {delimiter: results.meta.delimiter});
                }

                this.formattedErrors = this.formattedErrors.concat(_.map(results.errors, (error) => {
                  return `${error.type} at line ${row + 1} - ${error.message}`;
                }));

                data = data.concat(results.data);

                rows = rows.concat(_.map(results.data, (row) => {
                  return _.map(this.columns, (columnName) => {
                    return row[columnName];
                  });
                }));

                ++row;
              },
              complete: () => {
                $scope.$apply(() => {
                  this.rows = rows;

                  if (_.isUndefined(this.formattedErrors) || _.isEmpty(this.formattedErrors)) {
                    this.samples = data;
                  }
                  else {
                    delete this.samples;
                  }
                });
              }
            },
            this.parseOptions
          );

          Papa.parse(this.file, config);
        }, 100);

        $scope.$watch('wizard.parseOptions', (newValue, oldValue) => {
          // Delimiter is auto-detected in the first run of the parse function, so we don't want to
          // re-parse just because it's being initialized.
          if (!_.isUndefined(oldValue)) {
            this.parse();
          }
        }, true);

        $scope.$watch('wizard.file', () => {
          this.parse();
        });
      }
    };
  });
