import { Registry } from '../../common/lib/registry';
import { BaseForm } from './base_form';

export class ArgType extends BaseForm {
  constructor(name, props) {
    super(name, props);

    this.simpleTemplate = props.simpleTemplate;
    this.template = props.template;
    this.defaultValue = props.defaultValue;
  }
}

export const argTypeRegistry = new Registry();
