import { functionsRegistry } from '../../common/lib/functions_registry';
import { commonFunctions } from '../../common/functions';
import { clientFunctions } from '../functions';

function addFunction(fnDef) {
  functionsRegistry.register(fnDef);
}

clientFunctions.forEach(addFunction);
commonFunctions.forEach(addFunction);
