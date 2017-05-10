import { Registry } from '../../common/lib/registry';
import { BaseRenderable } from './base_renderable';

export class Datasource extends BaseRenderable {
  constructor(name, props) {
    super(name, props);
  }
}

export const datasourceRegistry = new Registry('expression_datasources');
