/**
 * Performance-enhancing way to only call a function when the
 * paramaters have changed. This is meant to serve as a lightweight
 * alternative to https://github.com/reactjs/reselect.
 *
 * Example:

    let one = 0;
    let two = 0;

    const fetcher = callWhenChanged(
      [() => one, () => two],
      (one, two) => {
        return one + two;
      }
    );

    expect(fetcher()).toEqual(0);
    one = 2;
    expect(fetcher()).toEqual(2);

 * See the tests for more examples.
 *
 * @param {Array} List of functions that return the parameters
 * @param {Function} Function to call when the parameters have changed
 */
export function callWhenChanged(fetchers, handler) {
  const fetchData = fetchers.reduce((accum, value, index) => {
    accum[index] = undefined;
    return accum;
  }, {});

  let state;

  return () => {
    let isDifferent = false;

    for (let i = 0; i < fetchers.length; i++) {
      const newValue = fetchers[i]();
      const oldValue = fetchData[i];

      if (newValue !== oldValue) {
        isDifferent = true;
        fetchData[i] = newValue;
      }
    }

    if (isDifferent) {
      state = handler(...Object.values(fetchData));
    }

    return state;
  };
}
