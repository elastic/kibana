import modules from 'ui/modules';
import template from './upload_data_step.html';
import _ from 'lodash';
import IngestProvider from 'ui/ingest';

modules.get('apps/settings')
.directive('uploadDataStep', function () {
  return {
    template: template,
    scope: {
      results: '='
    },
    bindToController: true,
    controllerAs: 'uploadStep',
    controller: function (Notifier, $window, Private) {
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
            this.formattedErrors = this.formattedErrors.concat(_.map(_.get(response, 'errors.index'), (doc) => {
              return `${doc._id.split('-', 1)[0].replace('L', 'Line ').trim()}: ${doc.error.type} - ${doc.error.reason}`;
            }));
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
    }
  };
});
