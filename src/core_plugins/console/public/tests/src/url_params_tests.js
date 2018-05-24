const _ = require('lodash');
import { UrlParams } from '../../src/autocomplete/url_params';
import { populateContext } from '../../src/autocomplete/engine';

const { test, module, deepEqual } = window.QUnit;

module('Url params');

function paramTest(name, description, tokenPath, expectedContext, globalParams) {

  test(name, function () {
    const urlParams = new UrlParams(description, globalParams || {});
    if (typeof tokenPath === 'string') {
      tokenPath = _.map(tokenPath.split('/'), function (p) {
        p = p.split(',');
        if (p.length === 1) {
          return p[0];
        }
        return p;
      });
    }

    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function (t) {
        if (_.isString(t)) {
          t = { name: t };
        }
        return t;
      });
      expectedContext.autoCompleteSet = _.sortBy(expectedContext.autoCompleteSet, 'name');
    }

    const context = {};

    populateContext(tokenPath, context, null,
      expectedContext.autoCompleteSet, urlParams.getTopLevelComponents()
    );


    if (context.autoCompleteSet) {
      context.autoCompleteSet = _.sortBy(context.autoCompleteSet, 'name');
    }

    deepEqual(context, expectedContext);
  });

}

function t(name, meta, insertValue) {
  let r = name;
  if (meta) {
    r = { name: name, meta: meta };
    if (meta === 'param' && !insertValue) {
      insertValue = name + '=';
    }
  }
  if (insertValue) {
    if (_.isString(r)) {
      r = { name: name };
    }
    r.insertValue = insertValue;
  }
  return r;
}

(function () {
  const params = {
    'a': ['1', '2'],
    'b': '__flag__'
  };
  paramTest('settings params',
    params,
    'a/1',
    { 'a': ['1'] }
  );

  paramTest('autocomplete top level',
    params,
    [],
    { autoCompleteSet: [t('a', 'param'), t('b', 'flag')] }
  );

  paramTest('autocomplete top level, with defaults',
    params,
    [],
    { autoCompleteSet: [t('a', 'param'), t('b', 'flag'), t('c', 'param')] },
    {
      'c': [2]
    }
  );

  paramTest('autocomplete values',
    params,
    'a',
    { autoCompleteSet: [t('1', 'a'), t('2', 'a')] }
  );

  paramTest('autocomplete values flag',
    params,
    'b',
    { autoCompleteSet: [t('true', 'b'), t('false', 'b')] }
  );


}());
