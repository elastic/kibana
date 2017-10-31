import { renderFunctionsRegistry } from './render_functions_registry';
import { renderFunctions } from '../render_functions';

renderFunctions.forEach(fnDef => renderFunctionsRegistry.register(fnDef));
