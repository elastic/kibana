import { filter, size } from 'lodash';
export default function GetFieldTypes() {
  const scriptedFieldCount = fields => size(filter(fields, 'scripted'));

  return [
    {
      title: 'fields',
      index: 'indexedFields',
      count({ fields }) {
        return size(fields) - scriptedFieldCount(fields);
      },
    },
    {
      title: 'scripted fields',
      index: 'scriptedFields',
      count({ fields }) {
        return scriptedFieldCount(fields);
      },
    },
    {
      title: 'field filters',
      index: 'fieldFilters'
    },
  ];
};
