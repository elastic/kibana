/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import util from 'util';

const log = (...args: unknown[]) => console.log(util.format(...args));

export const info = log;

export const withError = (msg: string) => chalk.bgRed.white(' ERROR ') + ' ' + msg;
export const withWarning = (msg: string) => chalk.bgYellow.black(' WARNING ') + ' ' + msg;

export const warn = (...args: unknown[]) => log(withWarning(util.format(...args)));

export const success = (...args: unknown[]) => log(chalk.green(util.format(...args)));

export const error = (...args: unknown[]) => log(withError(util.format(...args)) + '\n');

type Color = 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';
export const title = (color: Color, ...args: unknown[]) =>
  info('\n' + '  ' + chalk[color].bold(util.format(...args)) + '  ' + '\n');

export const divider = () => console.log('\n' + chalk.gray(Array(100).fill('=').join('')) + '\n');

export const spacer = (n: number = 0) => console.log(Array(n).fill('').join('\n'));

export const cyan = chalk.cyan;
export const blue = chalk.blueBright;
export const red = chalk.red;
export const green = chalk.greenBright;
export const gray = chalk.gray;
export const white = chalk.white;
export const magenta = chalk.magenta;
export const bold = chalk.bold;
