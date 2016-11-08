module.exports = function splitInterval(interval) {
  if (!interval.match(/[0-9]+[mshdwMy]+/g)) {
    throw new Error ('Malformed `interval`: ' + interval);
  }
  const parts = interval.match(/[0-9]+|[mshdwMy]+/g);

  return {
    count: parts[0],
    unit: parts[1]
  };
};
