export const range = (filter) => {
  const {column, gte, gt, lt, lte} = filter;
  return {
    bool: {
      should: [
        {bool: {must_not: {exists: {field: column}}}},
        {range: {[column]: {gte, gt, lt, lte}}},
      ]
    }
  };
};
