let returnVal = '/path/to/config';

const findUp = jest.fn(() => {
  return Promise.resolve(returnVal);
});

findUp.__set = val => {
  returnVal = val;
};

module.exports = findUp;
