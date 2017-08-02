import { pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { FunctionForm } from './function_form';

export class View extends FunctionForm {
  constructor(name, props) {
    super(name, props);
    const propNames = ['description', 'modelArgs', 'requiresContext'];
    const defaultProps = {
      description: `Element: ${name}`,
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));

    if (!this.modelArgs || !Array.isArray(this.modelArgs)) {
      throw new Error(`${this.name} element is invalid, all elements must contain a modelArgs array property`);
    }
  }
}

export const viewRegistry = new Registry();
