const defaultReturnValue = '/path/to/project/config';
let returnVal = defaultReturnValue;

const findUp = jest.fn(() => {
  const p = Promise.resolve(returnVal);
  returnVal = defaultReturnValue;
  return p;
});

findUp.__setMockPath = val => {
  returnVal = val;
};

module.exports = findUp;
