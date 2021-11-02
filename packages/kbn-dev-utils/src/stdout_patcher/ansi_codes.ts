/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface AnsiEscapes {
  /**
	Set the absolute position of the cursor. `x0` `y0` is the top left of the screen.
	*/
  cursorTo(x: number, y?: number): string;

  /**
	Set the position of the cursor relative to its current position.
	*/
  cursorMove(x: number, y?: number): string;

  /**
	Move cursor up a specific amount of rows.

	@param count - Count of rows to move up. Default is `1`.
	*/
  cursorUp(count?: number): string;

  /**
	Move cursor down a specific amount of rows.

	@param count - Count of rows to move down. Default is `1`.
	*/
  cursorDown(count?: number): string;

  /**
	Move cursor forward a specific amount of rows.

	@param count - Count of rows to move forward. Default is `1`.
	*/
  cursorForward(count?: number): string;

  /**
	Move cursor backward a specific amount of rows.

	@param count - Count of rows to move backward. Default is `1`.
	*/
  cursorBackward(count?: number): string;

  /**
	Move cursor to the left side.
	*/
  cursorLeft: string;

  /**
	Save cursor position.
	*/
  cursorSavePosition: string;

  /**
	Restore saved cursor position.
	*/
  cursorRestorePosition: string;

  /**
	Get cursor position.
	*/
  cursorGetPosition: string;

  /**
	Move cursor to the next line.
	*/
  cursorNextLine: string;

  /**
	Move cursor to the previous line.
	*/
  cursorPrevLine: string;

  /**
	Hide cursor.
	*/
  cursorHide: string;

  /**
	Show cursor.
	*/
  cursorShow: string;

  /**
	Erase from the current cursor position up the specified amount of rows.

	@param count - Count of rows to erase.
	*/
  eraseLines(count: number): string;

  /**
	Erase from the current cursor position to the end of the current line.
	*/
  eraseEndLine: string;

  /**
	Erase from the current cursor position to the start of the current line.
	*/
  eraseStartLine: string;

  /**
	Erase the entire current line.
	*/
  eraseLine: string;

  /**
	Erase the screen from the current line down to the bottom of the screen.
	*/
  eraseDown: string;

  /**
	Erase the screen from the current line up to the top of the screen.
	*/
  eraseUp: string;

  /**
	Erase the screen and move the cursor the top left position.
	*/
  eraseScreen: string;

  /**
	Scroll display up one line.
	*/
  scrollUp: string;

  /**
	Scroll display down one line.
	*/
  scrollDown: string;

  /**
	Clear the terminal screen. (Viewport)
	*/
  clearScreen: string;

  /**
	Clear the whole terminal, including scrollback buffer. (Not just the visible part of it)
	*/
  clearTerminal: () => string;

  /**
	Output a beeping sound.
	*/
  beep: string;

  /**
	Create a clickable link.

	[Supported terminals.](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda) Use [`supports-hyperlinks`](https://github.com/jamestalmage/supports-hyperlinks) to detect link support.
	*/
  link(text: string, url: string): string;
}

const ESC = '\u001B[';
const OSC = '\u001B]';
const BEL = '\u0007';
const SEP = ';';
const isTerminalApp = false;

export const ansiEscapes: AnsiEscapes = {
  cursorTo: (x, y) => {
    if (typeof x !== 'number') {
      throw new TypeError('The `x` argument is required');
    }

    if (typeof y !== 'number') {
      return ESC + (x + 1) + 'G';
    }

    return ESC + (y + 1) + ';' + (x + 1) + 'H';
  },

  cursorMove: (x, y) => {
    if (typeof x !== 'number') {
      throw new TypeError('The `x` argument is required');
    }

    let returnValue = '';

    if (x < 0) {
      returnValue += ESC + -x + 'D';
    } else if (x > 0) {
      returnValue += ESC + x + 'C';
    }

    if (y !== undefined) {
      if (y < 0) {
        returnValue += ESC + -y + 'A';
      } else if (y > 0) {
        returnValue += ESC + y + 'B';
      }
    }

    return returnValue;
  },

  cursorUp: (count = 1) => ESC + count + 'A',
  cursorDown: (count = 1) => ESC + count + 'B',
  cursorForward: (count = 1) => ESC + count + 'C',
  cursorBackward: (count = 1) => ESC + count + 'D',

  cursorLeft: ESC + 'G',
  cursorSavePosition: isTerminalApp ? '\u001B7' : ESC + 's',
  cursorRestorePosition: isTerminalApp ? '\u001B8' : ESC + 'u',
  cursorGetPosition: ESC + '6n',
  cursorNextLine: ESC + 'E',
  cursorPrevLine: ESC + 'F',
  cursorHide: ESC + '?25l',
  cursorShow: ESC + '?25h',

  eraseLines: (count) => {
    let clear = '';

    for (let i = 0; i < count; i++) {
      clear += ansiEscapes.eraseLine + (i < count - 1 ? ansiEscapes.cursorUp() : '');
    }

    if (count) {
      clear += ansiEscapes.cursorLeft;
    }

    return clear;
  },

  eraseEndLine: ESC + 'K',
  eraseStartLine: ESC + '1K',
  eraseLine: ESC + '2K',
  eraseDown: ESC + 'J',
  eraseUp: ESC + '1J',
  eraseScreen: ESC + '2J',
  scrollUp: ESC + 'S',
  scrollDown: ESC + 'T',

  clearScreen: '\u001Bc',

  clearTerminal() {
    return process.platform === 'win32'
      ? `${this.eraseScreen}${ESC}0f`
      : // 1. Erases the screen (Only done in case `2` is not supported)
        // 2. Erases the whole screen including scrollback buffer
        // 3. Moves cursor to the top-left position
        // More info: https://www.real-world-systems.com/docs/ANSIcode.html
        `${this.eraseScreen}${ESC}3J${ESC}H`;
  },

  beep: BEL,

  link: (text, url) => {
    return [OSC, '8', SEP, SEP, url, BEL, text, OSC, '8', SEP, SEP, BEL].join('');
  },
};
