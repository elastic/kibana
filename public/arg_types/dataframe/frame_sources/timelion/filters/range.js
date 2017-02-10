export const range = (filter) => {
  return {
    bool: {
      should: [
        {bool: {must_not: {exists: {field: filter.column}}}},
        {range: {[filter.column]: filter.value}},
      ]
    }
  };
};
