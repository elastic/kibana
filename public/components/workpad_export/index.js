/* eslint import/no-unresolved: 1 */
// TODO: remove eslint rule when updating to use the linked kibana resolve package
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { jobCompletionNotifications } from 'plugins/reporting/services/job_completion_notifications';
import { getWorkpad, getPages } from '../../state/selectors/workpad';
import { getReportingBrowserType } from '../../state/selectors/app';
import { notify } from '../../lib/notify';
import { WorkpadExport as Component } from './workpad_export';
import { createPdf } from './utils';

const mapStateToProps = state => ({
  workpad: getWorkpad(state),
  pageCount: getPages(state).length,
  enabled: getReportingBrowserType(state) === 'chromium',
});

export const WorkpadExport = compose(
  connect(mapStateToProps),
  withProps(() => ({
    onExport: (type, workpad, options) => {
      if (type === 'pdf') {
        return createPdf(workpad, options)
          .then(({ data }) => {
            notify.info(
              `A PDF is being created. You will be notified on completion and can track its progress in Management`,
              { title: `PDF export of workpad '${workpad.name}'` }
            );

            // register the job so a completion notification shows up when it's ready
            jobCompletionNotifications.add(data.job.id);
          })
          .catch(err => {
            notify.error(err, { title: `Failed to create PDF for '${workpad.name}'` });
          });
      }

      throw new Error(`Unknown export type: ${type}`);
    },
  }))
)(Component);
