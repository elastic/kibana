import { commonFunctions } from '../../common/functions';
import { clientFunctions } from '../functions';
import { functionsRegistry } from './functions_registry';

function addFunction(fnDef) {
  functionsRegistry.register(fnDef);
}

clientFunctions.forEach(addFunction);
commonFunctions.forEach(addFunction);
