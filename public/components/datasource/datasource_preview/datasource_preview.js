import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';
import { Datatable } from '../../datatable';

export const DatasourcePreview = ({ show, done, datatable }) =>
  show ? (
    <EuiOverlayMask>
      <EuiModal onClose={done} style={{ maxWidth: '1000px' }}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Datasource Preview</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <p>
            Shown below are the first 10 rows of your datasource. Click <strong>Save</strong> in the
            sidebar to use this data.
          </p>

          <EuiSpacer />

          <EuiPanel>
            <Datatable datatable={datatable} showHeader />
          </EuiPanel>
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  ) : null;

DatasourcePreview.propTypes = {
  show: PropTypes.bool.isRequired,
  datatable: PropTypes.object,
  done: PropTypes.func,
};
