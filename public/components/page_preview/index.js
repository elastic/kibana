import { compose, withState } from 'recompose';
import { PagePreview as Component } from './page_preview';

export const PagePreview = compose(withState('width', 'setWidth', 77))(Component);
