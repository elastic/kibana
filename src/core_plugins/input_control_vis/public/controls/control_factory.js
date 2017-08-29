import { rangeControlFactory } from './range_control_factory';
import { termsControlFactory } from './terms_control_factory';

export function controlFactory(controlParamsArray, kbnApi, callback) {
  const createRequestPromises = controlParamsArray.filter((control) => {
    // ignore controls that do not have indexPattern or field
    return control.indexPattern && control.fieldName;
  })
  .map(async (controlParams, index) => {
    let factory = null;
    switch (controlParams.type) {
      case 'range':
        factory = rangeControlFactory;
        break;
      case 'terms':
        factory = termsControlFactory;
        break;
    }

    if (factory) {
      return factory(
        controlParams,
        kbnApi,
        callback.bind(null, index));
    }
  });
  Promise.all(createRequestPromises).then(searchRequests => {
    // control factory may return nothing if Control does not require a SearchRequest for initialization
    // remove empty elements from array before fetch
    const validSearchRequests = searchRequests.filter((request) => {
      if (request) {
        return true;
      }
      return false;
    });
    if (validSearchRequests.length > 0) {
      kbnApi.fetch.these(validSearchRequests);
    }
  });
}
