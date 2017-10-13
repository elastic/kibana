import React from 'react';
import { Table } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { Paginate } from '../paginate';
import { PageControls } from '../paginate_controls';
import moment from 'moment';
import './datatable.less';

const getIcon = (type) => {
  if (type === null) return;

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

const getColumnName = col => (typeof col === 'string') ? col : col.name;

const getColumnType = col => col.type || null;

const getFormattedValue = (val, type) => {
  if (type === 'date') return moment(val).format();
  return val;
};

export const Datatable = ({ datatable, perPage, paginate }) => (
  <Paginate rows={datatable.rows} perPage={perPage || 10}>
    {({ rows, nextPage, prevPage, setPage, prevPageEnabled, nextPageEnabled, pageNumber, totalPages }) => (
      <div className="canvas__datatable">
        <div style={{ flexGrow: 1 }}>
          <Table condensed>
            <thead>
              <tr>
                {datatable.columns.map(col => (
                  <th key={`header-${getColumnName(col)}`}>
                    {getColumnName(col)} <small className="muted">{getIcon(getColumnType(col))}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`row-${row._rowId || i}`}>
                  {datatable.columns.map(col => (
                    <td key={`row-${row._rowId || i}-${getColumnName(col)}`}>{
                      getFormattedValue(row[getColumnName(col)], getColumnType(col))
                    }</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {paginate && (
          <PageControls
            prevPage={prevPage}
            prevPageEnabled={prevPageEnabled}
            setPage={setPage}
            pageNumber={pageNumber}
            totalPages={totalPages}
            nextPage={nextPage}
            nextPageEnabled={nextPageEnabled}
          />
        )}


      </div>
    )}
  </Paginate>
);

Datatable.propTypes = {
  datatable: PropTypes.object.isRequired,
  perPage: PropTypes.number,
  paginate: PropTypes.bool,
};
