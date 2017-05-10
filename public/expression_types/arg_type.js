import { Registry } from '../../common/lib/registry';
import { BaseRenderable } from './base_renderable';

export class ArgType extends BaseRenderable {
  constructor(name, props) {
    super(name, props);
  }
}

export const argTypeRegistry = new Registry();
