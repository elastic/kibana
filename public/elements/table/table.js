import React from 'react';
import _ from 'lodash';
import Element from 'plugins/rework/elements/element';
import elements from 'plugins/rework/elements/elements';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import icon from './icon.svg';
import Arg from 'plugins/rework/arg_types/arg';

elements.push(new Element('table', {
  displayName: 'Table',
  icon: icon,
  args: [
    new Arg('dataframe', {
      type: 'dataframe',
    })
  ],
  template: ({args}) => {
    const {dataframe} = args;
    const header = _.map(dataframe.columns.ordered, (column) => (
      <th className={`reframe--type--${column.type}`} key={column.name}>
        {column.name}
      </th>
    ));

    const rows = _.map(dataframe.toTuples, (row, i) => {
      const fields = _.map(row, field => (
        <td className={`reframe--type--${field.column.type}`} key={field.column.name}>
          {field.value}
        </td>)
      );

      return (<tr key={i}>{fields}</tr>);
    });

    return (
      <div style={{height: '100%', overflow: 'auto'}}>
        <table className="table">
          <thead><tr>{header}</tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }
}));
