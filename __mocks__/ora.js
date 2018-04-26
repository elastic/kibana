module.exports = () => {
  return {
    start: () => ({
      succeed: () => {},
      stop: () => {},
      fail: () => {},
      stopAndPersist: () => {}
    })
  };
};
