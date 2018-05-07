/**
 * Forwards modifyAggConfigOnSearchRequestStart calls to a nested AggConfig.
 * This must be used for each parameter, that accepts a nested aggregation, otherwise
 * some paramters of the nested aggregation might not work properly (like auto interval
 * on a nested date histogram).
 * You should assign the return value of this function to the modifyAggConfigOnSearchRequestStart
 * of the parameter that accepts a nested aggregation. Example:
 * {
 *   name: 'customBucket',
 *   modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart('customBucket')
 * }
 *
 * @param {string} paramName - The name of the parameter, that this function should foward
 *      calls to. That should match the name of the parameter the function is called on.
 * @returns {function} A function, that fowards the calls.
 */
function forwardModifyAggConfigOnSearchRequestStart(paramName) {
  return (aggConfig, ...args) => {
    if (!aggConfig || !aggConfig.params) {
      return;
    }
    const nestedAggConfig = aggConfig.params[paramName];
    if (nestedAggConfig && nestedAggConfig.type && nestedAggConfig.type.params) {
      nestedAggConfig.type.params.forEach(param => {
        // Check if this parameter of the nested aggConfig has a modifyAggConfigOnSearchRequestStart
        // function, that needs to be called.
        if (param.modifyAggConfigOnSearchRequestStart) {
          param.modifyAggConfigOnSearchRequestStart(nestedAggConfig, ...args);
        }
      });
    }
  };
}

export { forwardModifyAggConfigOnSearchRequestStart };
