import { pick } from 'lodash';
import { BaseRenderable } from './base_renderable';

export class View extends BaseRenderable {
  constructor(name, props) {
    super(name, props);
    const propNames = ['description', 'modelArgs'];
    const defaultProps = {
      description: `Element: ${name}`,
    };

    Object.assign(this, defaultProps, pick(props, propNames));

    if (!this.modelArgs || !Array.isArray(this.modelArgs)) {
      throw new Error(`${this.name} element is invalid, all elements must contain a modelArgs array property`);
    }
  }
}
