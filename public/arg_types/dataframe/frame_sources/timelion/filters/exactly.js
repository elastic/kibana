export const exactly = (filter) => {
  return {
    bool: {
      should: [
        {bool: {must_not: {exists: {field: filter.column}}}},
        {match: {[filter.column]: filter.value}},
      ]
    }
  };
};
