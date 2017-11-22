const pairs = ['()', '[]', '{}', `''`, '""'];
const openers = pairs.map(pair => pair[0]);
const closers = pairs.map(pair => pair[1]);

export function autocompletePairs({ value, selection }, event) {
  const { start, end } = selection;
  const { key } = event;

  if (start === end && closers.includes(key) && value.charAt(end) === key) {
    // Don't insert the closer, but do move the cursor forward
    event.preventDefault();
    return {
      value,
      selection: { start: end + 1, end: end + 1 },
    };
  } else if (openers.includes(key)) {
    // Insert the opener and the closer and move the cursor forward
    event.preventDefault();
    return {
      value: value.substr(0, start) + key + value.substring(start, end) + closers[openers.indexOf(key)] + value.substr(end),
      selection: { start: start + 1, end: end + 1 },
    };
  } else if (start === end && key === 'Backspace' && !event.metaKey && pairs.includes(value.substr(end - 1, 2))) {
    // Remove the opener and the closer and move the cursor backward
    event.preventDefault();
    return {
      value: value.substr(0, end - 1) + value.substr(end + 1),
      selection: { start: end - 1, end: end - 1 },
    };
  } else {
    return { value, selection };
  }
}
