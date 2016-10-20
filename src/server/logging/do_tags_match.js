import { isArray } from 'lodash';

export function doTagsMatch(event, expectedTags) {
  if (!event || !isArray(event.tags)) {
    return false;
  }

  if (event.tags.length !== expectedTags.length) {
    return false;
  }

  const unmatchedEventTags = event.tags.slice(0);
  const unmatchedExpectedTags = [];
  expectedTags.forEach(t => {
    const i = unmatchedEventTags.indexOf(t);
    if (i > -1) {
      unmatchedEventTags.splice(i, 1);
    } else {
      unmatchedExpectedTags.push(t);
    }
  });

  return unmatchedEventTags.concat(unmatchedExpectedTags).length === 0;
}
