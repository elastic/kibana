import { Registry } from '../../common/lib/registry';
import { Transition } from '../transitions/transition';

class TransitionsRegistry extends Registry {
  wrapper(obj) {
    return new Transition(obj);
  }
}

export const transitionsRegistry = new TransitionsRegistry();
