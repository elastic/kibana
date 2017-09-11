import React from 'react';
import { Table, Form, ControlLabel, FormControl } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { Paginate } from '../paginate';
import { PageControls } from '../paginate_controls';
import './datatable.less';

const getIcon = (type) => {
  switch (type) {
    case 'string':
      return (<strong>a</strong>);
    case 'number':
      return (<strong>#</strong>);
    case 'date':
      return (<i className="fa fa-calendar"/>);
    default:
      return (<strong>?</strong>);
  }
};

export const Datatable = ({ datatable, perPage, setPerPage }) => (
  <Paginate rows={datatable.rows} perPage={perPage || 10}>
    {({ rows, nextPage, prevPage, setPage, prevPageEnabled, nextPageEnabled, pageNumber, totalPages }) => (
      <div className="canvas__element--datatable" style={{ height: '100%', overflow: 'auto' }}>
        <Table condensed>
          <thead>
            <tr>
              {datatable.columns.map(col => (
                <th key={`header-${col.name}`}>{col.name} <small className="muted">{getIcon(col.type)}</small></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`row-${row._rowId}`}>
                {datatable.columns.map(col => (
                  <td key={`row-${row._rowId}-${col.name}`}>{row[col.name]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>

        <PageControls
          prevPage={prevPage}
          prevPageEnabled={prevPageEnabled}
          setPage={setPage}
          pageNumber={pageNumber}
          totalPages={totalPages}
          nextPage={nextPage}
          nextPageEnabled={nextPageEnabled}
        />

        <Form inline className="controls--perpage">
          <ControlLabel>Per Page</ControlLabel>
          <FormControl componentClass="select" onChange={(ev) => setPerPage(ev.target.value)}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </FormControl>
        </Form>
      </div>
    )}
  </Paginate>
);

Datatable.propTypes = {
  datatable: PropTypes.object.isRequired,
  setPerPage: PropTypes.func.isRequired,
  perPage: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
};
