import { file } from "tmp-promise";

export const createTempFile = async () => {
  const { path } = await file();
  return path;
};
