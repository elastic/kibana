export const TAR = '.tar.gz';
export const ZIP = '.zip';

export default function fileType(filename) {
  if (/\.zip$/i.test(filename)) {
    return ZIP;
  }
  if (/\.tar\.gz$/i.test(filename)) {
    return TAR;
  }
  if (/\.tgz$/i.test(filename)) {
    return TAR;
  }
}
