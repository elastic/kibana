import _ from 'lodash';
import ansicolors from 'ansicolors';

export const green = _.flow(ansicolors.black, ansicolors.bgGreen);
export const red = _.flow(ansicolors.white, ansicolors.bgRed);
export const yellow = _.flow(ansicolors.black, ansicolors.bgYellow);
