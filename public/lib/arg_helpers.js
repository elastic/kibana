import { isArray, includes } from 'lodash';

/*

  IMPORTANT: These only work with simple values, eg string, number, boolean.
  Getting or setting anything else will throw.

*/

const allowedTypes = ['string', 'number', 'boolean'];
const badType = () => new Error(`Arg setting helpers only support ${allowedTypes.join(',')}`);

const isAllowed = (type) => includes(allowedTypes, type);

export function wrapSimpleArgValue(value) {
  const type = typeof value;
  if (!isAllowed(type)) throw badType();
  return { value, type };
}

export function getSimpleArg(name, args) {
  if (!args[name]) return;
  return args[name].map(astVal => {
    if (!isAllowed(astVal.type)) throw badType();
    return astVal.value;
  });
}

export function setSimpleArg(name, value) {
  value = isArray(value) ? value : [value];
  return { [name]: value.map(wrapSimpleArgValue) };
}
