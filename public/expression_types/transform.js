import { pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { FunctionForm } from './function_form';

export class Transform extends FunctionForm {
  constructor(name, props) {
    super(name, props);

    const propNames = ['requiresContext'];
    const defaultProps = {
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));
  }
}

export const transformRegistry = new Registry();
