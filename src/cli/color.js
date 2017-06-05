
import _ from 'lodash';
import ansicolors from 'ansicolors';

exports.green = _.flow(ansicolors.black, ansicolors.bgGreen);
exports.red = _.flow(ansicolors.white, ansicolors.bgRed);
exports.yellow = _.flow(ansicolors.black, ansicolors.bgYellow);
