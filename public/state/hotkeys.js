import { bindShortcuts } from 'redux-shortcuts';
import { pageNext, pagePrevious } from './actions/page';
import { editorToggle} from './actions/editor';
import { fullscreenToggle } from './actions/misc';

export const bindHotkeys = (store) => {
  bindShortcuts(
    [['alt+right'], pageNext, true],
    [['alt+left'], pagePrevious, true],
    [['alt+e', 'alt+l'], editorToggle],
    [['alt+f'], fullscreenToggle],

  )(store.dispatch);
};
