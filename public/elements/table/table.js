import { Element } from '../element';
import ReactDOM from 'react-dom';
import React from 'react';
import { Table } from 'react-bootstrap';

module.exports = new Element({
  name: 'table',
  displayName: 'Line Chart',
  icon: null,
  schema: {
    datasource: true,
    model: 'pointseries',
  },
  destroy(args) {
    console.log('destory table', args);
  },
  render(domNode, config, done) {
    const table = (
      <Table striped bordered condensed>
        <thead>
          <tr>
            {config.columns.map(col => (
              <th key={`header-${col.name}`}>{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {config.rows.map(row => (
            <tr key={`row-${row._rowId}`}>
              {config.columns.map(col => (
                <td key={`row-${row._rowId}-${col.name}`}>{row[col.name]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    );

    ReactDOM.render(table, domNode);
    done();
  },
});
