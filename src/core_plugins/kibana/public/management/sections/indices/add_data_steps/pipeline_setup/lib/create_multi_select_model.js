import _ from 'lodash';

export default function selectableArray(items, selectedItems) {
  if (!_.isArray(items)) throw new Error('First argument must be an array');
  if (!_.isArray(selectedItems)) throw new Error('Second argument must be an array');

  return items.map((item) => {
    const selected = _.find(selectedItems, (selectedItem) => {
      return cleanItem(selectedItem) === cleanItem(item);
    });

    return {
      title: item,
      selected: !_.isUndefined(selected)
    };
  });
};

function cleanItem(item) {
  return _.trim(item).toUpperCase();
}
