export function latestChange(...firstArgs) {
  let oldState = firstArgs;
  let prevValue = null;

  return (...args) => {
    let found = false;

    const newState = oldState.map((oldVal, i) => {
      const val = args[i];
      if (!found && oldVal !== val) {
        found = true;
        prevValue = val;
      }
      return val;
    });

    oldState = newState;

    return prevValue;
  };
}
