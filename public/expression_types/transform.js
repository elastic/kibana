import { pick } from 'lodash';
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
