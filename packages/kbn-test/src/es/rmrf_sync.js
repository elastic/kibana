import * as fs from 'fs';

/**
 * Recurive deletion for a directory
 *
 * @param {String} path
 */
export function rmrfSync(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      const curPath = path + '/' + file;

      if (fs.lstatSync(curPath).isDirectory()) {
        rmrfSync(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}
