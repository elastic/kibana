import _ from 'lodash';

export function IndicesEditSectionsProvider() {

  return function (indexPattern) {
    const fieldCount = _.countBy(indexPattern.fields, function (field) {
      return (field.scripted) ? 'scripted' : 'indexed';
    });

    _.defaults(fieldCount, {
      indexed: 0,
      scripted: 0,
      sourceFilters: indexPattern.sourceFilters ? indexPattern.sourceFilters.length : 0,
    });

    return [
      {
        title: 'Fields',
        index: 'indexedFields',
        count: fieldCount.indexed
      },
      {
        title: 'Scripted fields',
        index: 'scriptedFields',
        count: fieldCount.scripted
      },
      {
        title: 'Source filters',
        index: 'sourceFilters',
        count: fieldCount.sourceFilters
      }
    ];
  };
}
