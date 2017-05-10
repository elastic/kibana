import { pick } from 'lodash';
import { Registry } from '../../common/lib/registry';
import { BaseRenderable } from './base_renderable';

export class Transform extends BaseRenderable {
  constructor(name, props) {
    super(name, props);

    const propNames = ['requiresContext'];
    const defaultProps = {
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));
  }
}

export const transformRegistry = new Registry('expression_transforms');
