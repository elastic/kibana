export function pick<T extends { [k: string]: any }, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const newObj = keys.reduce(
    (acc, val) => {
      acc[val] = obj[val];
      return acc;
    },
    {} as { [k: string]: any }
  );

  return newObj as Pick<T, K>;
}
