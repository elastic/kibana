import path from "path";

export function toArray(val?: string | string[]) {
  return val ? (typeof val === "string" ? [val] : val) : [];
}

export function toPosix(file: string, sep: string = path.sep) {
  return file.split(sep).join(path.posix.sep);
}

export const getRandomPort = () => {
  const min = 1024;
  const max = 65535;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
