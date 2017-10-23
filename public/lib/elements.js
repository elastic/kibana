import { Registry } from '../../common/lib/registry';
import { Element } from '../elements/element';

class ElementsRegistry extends Registry {
  wrapper(obj) {
    return new Element(obj);
  }
}

export const elementsRegistry = new ElementsRegistry();
