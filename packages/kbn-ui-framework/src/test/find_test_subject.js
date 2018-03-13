/**
 * Find node which matches a specific test subject selector. Returns ReactWrappers around DOM element,
 * https://github.com/airbnb/enzyme/tree/master/docs/api/ReactWrapper.
 * Typically call simulate on ReactWrapper or call getDOMNode to get underlying DOM node.
 */
export const findTestSubject = (mountedComponent, testSubjectSelector) => {
  const testSubject = mountedComponent.find(`[data-test-subj="${testSubjectSelector}"]`);

  // restore enzyme 2 default find behavior of only returning ReactWrappers around DOM element
  // where as enzyme 3 returns both 1) ReactWrappers around DOM element and 2) react component.
  // https://github.com/airbnb/enzyme/issues/1174
  return testSubject.hostNodes();
};
