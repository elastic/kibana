import { promisify } from 'util';
import fs from 'fs';

export const writeFile = promisify(fs.writeFile);
export const readFile = promisify(fs.readFile);
export const stat = promisify(fs.stat);
export const chmod = promisify(fs.chmod);
