import { Registry } from '../../common/lib/registry';
import { BaseForm } from './base_form';

export class ArgType extends BaseForm {
  constructor(name, props) {
    super(name, props);
  }
}

export const argTypeRegistry = new Registry();
