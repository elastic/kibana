import modules from 'ui/modules';
import template from './upload_data_step.html';
import _ from 'lodash';
import IngestProvider from 'ui/ingest';
import './styles/_add_data_upload_data_step.less';

function formatIndexError(errorDoc) {
  const lineNumber = errorDoc._id.substr(errorDoc._id.lastIndexOf(':') + 1);
  const errorType = errorDoc.error.type;
  const errorReason = errorDoc.error.reason;

  return `Line ${lineNumber}: ${errorType} - ${errorReason}`;
}

modules.get('apps/management')
.directive('uploadDataStep', function () {
  return {
    template: template,
    scope: {
      results: '='
    },
    bindToController: true,
    controllerAs: 'uploadStep',
    controller: function (Notifier, $window, Private, $scope) {
      const ingest = Private(IngestProvider);
      const notify = new Notifier({
        location: 'Add Data'
      });

      const usePipeline = !_.isEmpty(_.get(this.results, 'pipeline.processors'));
      ingest.uploadCSV(this.results.file, this.results.indexPattern.id, this.results.parseOptions.delimiter, usePipeline)
      .then(
        (res) => {
          this.created = 0;
          this.formattedErrors = [];
          _.forEach(res.data, (response) => {
            this.created += response.created;
            this.formattedErrors = this.formattedErrors.concat(_.map(_.get(response, 'errors.index'), formatIndexError));
            if (!_.isEmpty(_.get(response, 'errors.other'))) {
              this.formattedErrors = this.formattedErrors.concat(response.errors.other);
            }
          });
        },
        (err) => {
          notify.error(err);
          $window.scrollTo(0, 0);
        }
      );

      this.showAllErrors = false;
      this.defaultErrorLimit = 10;
      this.displayErrors = [];
      $scope.$watchGroup(['uploadStep.formattedErrors', 'uploadStep.showAllErrors'], (newValues) => {
        const [formattedErrors, showAllErrors] = newValues;

        if (showAllErrors && formattedErrors) {
          this.displayErrors = formattedErrors;
        }
        else if (formattedErrors) {
          this.displayErrors = formattedErrors.slice(0, this.defaultErrorLimit + 1);
        }
      });
    }
  };
});
