import { bold, dim, green, yellow, red, cyan } from 'chalk';

export const suite = bold;
export const pending = cyan;
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
      return dim(txt);
  }
}
