import {
  Comparators
} from '@elastic/eui';

export const getItemsOnPage = (items, pageIndex, pageSize, sortField, sortDirection) => {
  let itemsOnPage;

  if (sortField) {
    itemsOnPage = items.slice(0).sort(Comparators.property(sortField, Comparators.default(sortDirection)));
  } else {
    itemsOnPage = items;
  }

  if (!pageIndex && !pageSize) {
    return itemsOnPage;
  }

  const startIndex = pageIndex * pageSize;
  return itemsOnPage.slice(startIndex, Math.min(startIndex + pageSize, itemsOnPage.length));
};
