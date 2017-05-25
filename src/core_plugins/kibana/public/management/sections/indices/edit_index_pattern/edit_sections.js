import _ from 'lodash';

export function IndicesEditSectionsProvider() {

  return function (indexPattern) {
    const fieldCount = _.countBy(indexPattern.fields, function (field) {
      if (field.scripted) {
        return 'scripted';
      } else if (field.meta) {
        return 'meta';
      } else {
        return 'indexed';
      }
    });

    _.defaults(fieldCount, {
      indexed: 0,
      scripted: 0,
      sourceFilters: 0,
      metaFilters: 0
    });

    return [
      {
        title: 'fields',
        index: 'indexedFields',
        count: fieldCount.indexed
      },
      {
        title: 'scripted fields',
        index: 'scriptedFields',
        count: fieldCount.scripted
      },
      {
        title: 'source filters',
        index: 'sourceFilters',
        count: fieldCount.sourceFilters
      },
      {
        title: 'meta fields',
        index: 'metaFields',
        count: fieldCount.meta
      }
    ];
  };
}
