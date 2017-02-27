const safeMakeLabel = function (agg) {
  try {
    return agg.makeLabel();
  } catch (e) {
    return '- agg not valid -';
  }
};

export default safeMakeLabel;
