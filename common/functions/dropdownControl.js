import { uniq } from 'lodash';

export const dropdownControl = () => ({
  name: 'dropdownControl',
  aliases: [],
  type: 'render',
  context: {
    types: ['datatable'],
  },
  help: 'Configure a drop down filter control element',
  args: {
    filterColumn: {
      type: ['string'],
      help: 'The column or field to attach the filter to',
    },
    valueColumn: {
      type: ['string'],
      help: 'The datatable column from which to extract the unique values for the drop down',
    },
  },
  fn: (context, { valueColumn, filterColumn }) => {
    const choices = uniq(context.rows.map(row => row[valueColumn])).sort();

    return {
      type: 'render',
      as: 'dropdown_filter',
      value: {
        column: filterColumn,
        choices,
      },
    };
  },
});
