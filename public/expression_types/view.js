import { pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { FunctionForm } from './function_form';

export class View extends FunctionForm {
  constructor(props) {
    super(props);

    const propNames = ['help', 'modelArgs', 'requiresContext'];
    const defaultProps = {
      help: `Element: ${props.name}`,
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));

    if (!this.modelArgs || !Array.isArray(this.modelArgs)) {
      throw new Error(`${this.name} element is invalid, all elements must contain a modelArgs array property`);
    }
  }
}

class ViewRegistry extends Registry {
  wrapper(obj) {
    return new View(obj);
  }
}

export const viewRegistry = new ViewRegistry();
