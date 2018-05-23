import _ from 'lodash';
import { saveAs } from '@elastic/filesaver';
import chrome from 'ui/chrome';

function buildCsv(columns, rows) {
  const settings = chrome.getUiSettingsClient();
  const csvSeparator = settings.get('csv:separator', ',');
  const quoteValues = settings.get('csv:quoteValues', true);

  // const columns = formatted ? $scope.formattedColumns : $scope.table.columns;
  const nonAlphaNumRE = /[^a-zA-Z0-9]/;
  const allDoubleQuoteRE = /"/g;

  function escape(val) {
    if (_.isObject(val)) val = val.valueOf();
    val = String(val);
    if (quoteValues && nonAlphaNumRE.test(val)) {
      val = `"${val.replace(allDoubleQuoteRE, '""')}"`;
    }
    return val;
  }

  // Build the header row by its names
  const header = columns.map(col => escape(col.name));

  // Convert the array of row objects to an array of row arrays
  const orderedFieldNames = columns.map(col => col.field);
  const csvRows = rows.map(row => {
    return orderedFieldNames.map(field => escape(row[field]));
  });

  return [header, ...csvRows]
    .map(row => row.join(csvSeparator))
    .join('\r\n')
    + '\r\n'; // Add \r\n after last line
}

function exportAsCsv(filename, columns, rows) {
  const csv = new Blob([buildCsv(columns, rows)], { type: 'text/plain;charset=utf-8' });
  saveAs(csv, filename);
}

export { exportAsCsv };
