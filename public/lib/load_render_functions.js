import { renderFunctions } from '../render_functions';
import { renderFunctionsRegistry } from './render_functions_registry';

renderFunctions.forEach(fnDef => renderFunctionsRegistry.register(fnDef));
