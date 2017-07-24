import React from 'react';
import { Table } from 'react-bootstrap';
import PropTypes from 'prop-types';


export const Datatable = ({ datatable }) => (
  <div className="canvas__element--datatable" style={{ height: '100%', overflow: 'auto' }}>
    <Table condensed>
      <thead>
        <tr>
          {datatable.columns.map(col => (
            <th key={`header-${col.name}`}>{col.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {datatable.rows.map(row => (
          <tr key={`row-${row._rowId}`}>
            {datatable.columns.map(col => (
              <td key={`row-${row._rowId}-${col.name}`}>{row[col.name]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
);

Datatable.propTypes = {
  datatable: PropTypes.object,
};
