import { sortBy as sortByLodash, chunk } from 'lodash';

export const collectionManager = (defaultItems, filter, defaults) => {
  let items = defaultItems;
  let {
    sortBy,
    sortAsc = true,
    filterBy = {},
    page = 0,
    perPage = 10,
  } = defaults;

  let listener = null;

  const getItems = () => {
    let subsetOfItems = Array.from(items);

    const numOfPages = Math.ceil(subsetOfItems.length / perPage);

    // filter
    subsetOfItems = subsetOfItems.filter(item => filter(item, filterBy));

    // sort
    if (!!sortBy) {
      subsetOfItems = sortByLodash(subsetOfItems, sortBy);
      if (!!!sortAsc) {
        subsetOfItems.reverse();
      }
    }

    // paginate
    const pages = chunk(subsetOfItems, perPage);
    subsetOfItems = pages[page] || [];

    return { items: subsetOfItems, numOfPages };
  };

  const pushItems = () => {
    if (listener) {
      listener(getItems());
    }
  };

  return {
    getMutateMethods: () => ({
      setSortBy: arg => {
        if (sortBy === arg) {
          sortAsc = !sortAsc;
        }
        sortBy = arg;
        pushItems();
      },
      setFilterBy: arg => { filterBy = { ...filterBy, ...arg }; pushItems(); },
      setPage: arg => { page = arg; pushItems(); },
      setPerPage: arg => { perPage = arg; pushItems(); },
    }),
    watchForItems: arg => listener = arg,
    setItems: arg => { items = arg; pushItems(); },
  };
};
