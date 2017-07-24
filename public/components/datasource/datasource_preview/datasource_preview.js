import React from 'react';
import { Datatable } from '../../datatable';
import PropTypes from 'prop-types';
import './datasource_preview.less';

export const DatasourcePreview = ({ done, datatable }) => (
  //<Datatable datatable={datatable}/>
  <div style={{ overflow: 'auto' }}>
    {!done ? null : (
      <a onClick={() => done()}>&lt; Back</a>
    )}
    <div className="canvas__datasource_preview">
      <Datatable datatable={datatable}/>
    </div>

  </div>

);

DatasourcePreview.propTypes = {
  datatable: PropTypes.object,
  done: PropTypes.func,
};
