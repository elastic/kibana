import _ from 'lodash';
import chalk from 'chalk';

export const green = _.flow(chalk.black, chalk.bgGreen);
export const red = _.flow(chalk.white, chalk.bgRed);
export const yellow = _.flow(chalk.black, chalk.bgYellow);
