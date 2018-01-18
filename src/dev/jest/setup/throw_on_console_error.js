// Fail if a test ends up `console.error`-ing, e.g. if React logs because of a
// failed prop types check.
console.error = message => {
  throw new Error(message);
};
