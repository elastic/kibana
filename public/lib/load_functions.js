import { functions as functionsRegistry } from './functions';
import { clientFunctions } from '../functions';
import { commonFunctions } from '../../common/functions';

function addFunction(fnDef) {
  functionsRegistry.register(fnDef);
}

clientFunctions.forEach(addFunction);
commonFunctions.forEach(addFunction);
