import { Registry } from '../../common/lib/registry';
import { RenderFunction } from './render_function';

class RenderFunctionsRegistry extends Registry {
  wrapper(obj) {
    return new RenderFunction(obj);
  }
}

export const renderFunctionsRegistry = new RenderFunctionsRegistry();
