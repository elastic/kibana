import path from 'path';
const requireHelper = (filePath) => {
  let prefix = path.resolve(__dirname, '..');
  if (process.env.DIR_FOR_CODE_COVERAGE) {
    prefix = process.env.DIR_FOR_CODE_COVERAGE;
  }
  return require(path.resolve(prefix, filePath));
};
export default requireHelper;
