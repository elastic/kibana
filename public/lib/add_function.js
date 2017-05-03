import { clientFunctions } from './function_registry';

export function addFunction(fnDef) {
  clientFunctions.push(fnDef);
}
