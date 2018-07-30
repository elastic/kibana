import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { Datatable } from '../../datatable';

export const DatasourcePreview = ({ show, done, datatable }) =>
  show ? (
    <EuiOverlayMask>
      <EuiModal onClose={done}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Datasource Preview</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody className="canvasDatasourcePreview">
          <EuiText size="s" color="subdued">
            <p>
              Shown below are the first 10 rows of your datasource. Click <strong>Save</strong> in
              the sidebar to use this data.
            </p>
          </EuiText>
          <EuiPanel className="canvasDatasourcePreview__panel">
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
