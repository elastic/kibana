import fs from 'fs';
import { promisify } from 'util';

export const writeFile = promisify(fs.writeFile);
export const readFile = promisify(fs.readFile);
export const stat = promisify(fs.stat);
export const chmod = promisify(fs.chmod);
