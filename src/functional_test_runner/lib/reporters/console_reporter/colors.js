import { brightBlack, green, yellow, red, brightWhite, brightCyan } from 'ansicolors';

export const suite = brightWhite;
export const pending = brightCyan;
export const pass = green;
export const fail = red;

export function speed(name, txt) {
  switch (name) {
    case 'fast':
      return green(txt);
    case 'medium':
      return yellow(txt);
    case 'slow':
      return red(txt);
    default:
      return brightBlack(txt);
  }
}
