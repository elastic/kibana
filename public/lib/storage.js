import { Storage } from 'ui/storage';
import { getWindow } from './get_window';

const win = getWindow();

export const storage = new Storage(win.localStorage);
